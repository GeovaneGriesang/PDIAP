'use strict';

// Migração manual pra frente "login único" (ver memória project-frente7-login-unico).
// Cria uma Pessoa (models/pessoa-schema.js) pra cada documento (cpf) distinto encontrado
// em Avaliador + Participante, carregando a senha (hash bcrypt) já existente - ninguém
// perde acesso nem precisa trocar de senha por causa da migração. Linka `pessoa` em cada
// registro do papel correspondente.
//
// Idempotente: registros que já têm `pessoa` setado são pulados, então rodar de novo é
// seguro (não duplica Pessoa nem sobrescreve senha).
//
// Uso:
//   node scripts/migrar-pessoas.js --dry-run   (só imprime o que faria, não grava nada)
//   node scripts/migrar-pessoas.js             (roda de verdade)
//   --sem-divergentes: não une grupos de mesmo documento com e-mails diferentes (ver abaixo)
//
// Antes de rodar em produção: back-up (mongodump) primeiro - é a primeira migração desta
// frente que toca credencial de login existente.

require('dotenv').config(); // mesmo carregamento de .env que app.js faz

const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
require('../configs/db-config'); // side effect: abre a conexão padrão (mongoose.connect)
const Avaliador = require('../models/avaliador-schema');
const Participante = require('../models/participante-schema');
const Pessoa = require('../models/pessoa-schema');

const DRY_RUN = process.argv.includes('--dry-run');
// Deixa de fora (sem criar Pessoa nem vincular) os grupos de mesmo documento com e-mails
// diferentes entre os registros: unir esses grupos faz qualquer um dos e-mails poder redefinir
// a senha compartilhada, então só vale unir depois de revisar o relatório de divergências.
const SEM_DIVERGENTES = process.argv.includes('--sem-divergentes');

function normalizarDocumento(cpf) {
	return (cpf || '').toString().replace(/\D+/g, '');
}

// Fonte das credenciais do grupo: prioriza quem já escolheu senha própria
// (senhaDefinida:true - é o registro que a pessoa de fato usou pra logar),
// senão o mais recente por createdAt.
function escolherFonte(registros) {
	return registros.slice().sort((a, b) => {
		if (!!a.senhaDefinida !== !!b.senhaDefinida) return a.senhaDefinida ? -1 : 1;
		return (b.createdAt || 0) - (a.createdAt || 0);
	})[0];
}

async function migrar() {
	const avaliadores = await Avaliador.find({});
	const participantes = await Participante.find({});

	// Agrupa por documento normalizado - cada grupo é uma pessoa em potencial.
	const grupos = new Map();
	for (const registro of [...avaliadores, ...participantes]) {
		const documento = normalizarDocumento(registro.cpf);
		if (!documento) continue; // sem documento cadastrado - não dá pra migrar, fica sem pessoa
		if (!grupos.has(documento)) grupos.set(documento, []);
		grupos.get(documento).push(registro);
	}

	let pessoasCriadas = 0, pessoasReaproveitadas = 0, credenciaisAdotadas = 0, papeisLinkados = 0, papeisJaLinkados = 0, gruposPulados = 0;
	const divergencias = [];
	const semDocumento = avaliadores.length + participantes.length - [...grupos.values()].reduce((n, g) => n + g.length, 0);

	for (const [documento, registros] of grupos) {
		// Checa divergência de nome/email entre os registros do grupo (mesma pessoa,
		// dados diferentes) - só pra relatório, não bloqueia a migração. Compara
		// normalizado (minúsculo, sem espaço nas pontas) pra não sinalizar como
		// "divergente" o que é só diferença de maiúsculas (ex: "JOÃO" vs "João").
		const nomes = new Set(registros.map((r) => (r.nome || '').trim()).filter(Boolean));
		const emails = new Set(registros.map((r) => (r.email || '').trim().toLowerCase()).filter(Boolean));
		const nomesNormalizados = new Set([...nomes].map((n) => n.toLowerCase()));
		if (nomesNormalizados.size > 1 || emails.size > 1) {
			divergencias.push({
				documento,
				registros: registros.map((r) => ({ tipo: r.constructor.modelName, id: r._id.toString(), nome: r.nome, email: r.email }))
			});
		}
		if (SEM_DIVERGENTES && emails.size > 1) { gruposPulados++; continue; }

		const jaLinkado = registros.find((r) => r.pessoa);
		let pessoa = jaLinkado ? await Pessoa.findById(jaLinkado.pessoa) : null;
		if (!pessoa) pessoa = await Pessoa.findOne({ documento });

		if (!pessoa) {
			const fonte = escolherFonte(registros);

			if (DRY_RUN) {
				console.log(`[dry-run] criaria Pessoa documento=${documento} nome="${fonte.nome}" email="${fonte.email}" (fonte: ${fonte.constructor.modelName} ${fonte._id})`);
			} else {
				pessoa = new Pessoa({
					documento,
					nome: fonte.nome,
					email: fonte.email,
					telefone: fonte.telefone,
					nacionalidade: fonte.nacionalidade,
					password: fonte.password,
					senhaDefinida: !!fonte.senhaDefinida,
					resetPasswordToken: fonte.resetPasswordToken,
					resetPasswordCreatedDate: fonte.resetPasswordCreatedDate,
					createdAt: fonte.createdAt || Date.now()
				});
				await pessoa.save();
			}
			pessoasCriadas++;
		} else {
			pessoasReaproveitadas++;
			// Pessoa que já existia mas sem senha própria (ex: criada numa rodada anterior
			// que não chegou a copiar credenciais): adota a senha do melhor registro do
			// grupo, senão quem definiu senha própria perderia ela ao ser vinculado e
			// voltaria a entrar só com o documento. Nunca sobrescreve senha já definida.
			if (!pessoa.senhaDefinida) {
				const fonte = escolherFonte(registros);
				if (fonte.senhaDefinida && fonte.password) {
					if (DRY_RUN) {
						console.log(`[dry-run] Pessoa documento=${documento} adotaria a senha de ${fonte.constructor.modelName} ${fonte._id}`);
					} else {
						pessoa.password = fonte.password;
						pessoa.senhaDefinida = true;
						pessoa.resetPasswordToken = fonte.resetPasswordToken;
						pessoa.resetPasswordCreatedDate = fonte.resetPasswordCreatedDate;
						await pessoa.save();
					}
					credenciaisAdotadas++;
				}
			}
		}

		for (const registro of registros) {
			if (registro.pessoa) { papeisJaLinkados++; continue; }
			if (DRY_RUN) {
				console.log(`[dry-run] linkaria ${registro.constructor.modelName} ${registro._id} -> Pessoa documento=${documento}`);
			} else {
				registro.pessoa = pessoa._id;
				await registro.save();
			}
			papeisLinkados++;
		}
	}

	console.log('\n--- Resumo da migração' + (DRY_RUN ? ' (dry-run, nada foi gravado)' : '') + ' ---');
	console.log('Pessoas criadas:', pessoasCriadas);
	console.log('Pessoas já existentes reaproveitadas:', pessoasReaproveitadas);
	console.log('  dessas, adotaram a senha de um papel:', credenciaisAdotadas);
	console.log('Papéis linkados agora:', papeisLinkados);
	console.log('Papéis que já estavam linkados (pulados):', papeisJaLinkados);
	console.log('Registros sem documento (não migrados):', semDocumento);
	console.log('Grupos com nome/email divergente:', divergencias.length);
	if (SEM_DIVERGENTES) console.log('Grupos com e-mails diferentes deixados de fora (--sem-divergentes):', gruposPulados);

	if (divergencias.length) {
		const relatorioPath = path.join(__dirname, `relatorio-divergencias-pessoas${DRY_RUN ? '-dry-run' : ''}.json`);
		fs.writeFileSync(relatorioPath, JSON.stringify(divergencias, null, 2));
		console.log('Relatório de divergências salvo em', relatorioPath);
	}
}

mongoose.connection.once('open', () => {
	migrar()
		.then(() => {
			console.log('\nMigração concluída.');
			mongoose.connection.close().then(() => process.exit(0));
		})
		.catch((err) => {
			console.error('Erro na migração:', err);
			mongoose.connection.close().then(() => process.exit(1));
		});
});
