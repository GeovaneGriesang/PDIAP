'use strict';

// Migração manual da frente "cadastro único pra toda pessoa" (ver memória
// project-pessoa-cadastro-unico-todos): liga à Pessoa (models/pessoa-schema.js) os
// integrantes de projeto (orientador/estudante) e os responsáveis de evento já existentes,
// que foram gravados antes do campo `pessoa` existir. Só grava o campo `pessoa` no
// subdocumento - nome/cpf/email/certificados e updatedAt do projeto ficam intactos.
//
// Regras (mesmas do cadastro novo, ver controllers/pessoa-controller.js):
// - Documento inválido (validarDocumentoQualquerPais) => não vincula, vai pro relatório.
// - Integrante (dado veio da inscrição pública): Pessoa já existente só é reaproveitada se o
//   e-mail OU o nome completo (sem acento/maiúscula) bater com o dela - no levantamento local,
//   a maioria dos e-mails divergentes era a mesma pessoa que trocou de e-mail entre um ano e
//   outro. Só aqui (migração rodada pelo admin): no cadastro público vale só o e-mail, porque
//   nome não é segredo. Senão fica sem vínculo e vai pro relatório. Sem Pessoa, cria uma
//   com nome/e-mail/telefone/nacionalidade do integrante - a não ser que o e-mail já seja
//   login de OUTRA Pessoa (relatório).
// - Responsável de evento (cadastrado pelo admin): vincula à Pessoa do mesmo documento. Sem
//   Pessoa, não dá pra criar (responsável antigo não tem e-mail) - vai pro relatório, pra
//   completar pela tela de edição do evento.
// Integrantes são processados do projeto mais recente pro mais antigo, então quando o mesmo
// documento aparece em vários projetos, a Pessoa nasce com os dados mais atuais.
//
// Idempotente: subdocumentos que já têm `pessoa` são pulados.
//
// Uso:
//   node scripts/vincular-integrantes-responsaveis.js --dry-run   (não grava nada)
//   node scripts/vincular-integrantes-responsaveis.js             (roda de verdade)
//
// Antes de rodar em produção: mongodump primeiro. O relatório gerado (nomes/e-mails) é PII
// e não deve ser commitado (scripts/relatorio-*.json está no .gitignore).

require('dotenv').config();

const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
require('../configs/db-config');
const Projeto = require('../models/projeto-schema');
const Evento = require('../models/evento-schema');
const Pessoa = require('../models/pessoa-schema');
const documentoValidator = require('../utils/documentoValidator');
const { mesmoEmail } = require('../controllers/pessoa-controller');

const DRY_RUN = process.argv.includes('--dry-run');

function mesmoNome(a, b) {
	const n = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
	return n(a).length > 0 && n(a) === n(b);
}

function regexEmail(email) {
	return new RegExp('^' + email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i');
}

async function migrar() {
	const resumo = { integrantesVinculados: 0, integrantesPessoaCriada: 0, responsaveisVinculados: 0, jaVinculados: 0 };
	const relatorio = { documentoInvalido: [], emailDiferenteDoCadastro: [], emailDeOutraPessoa: [], semEmail: [], responsavelSemCadastro: [] };
	// Pessoas "criadas" no dry-run (documento -> dados), pra simular os próximos integrantes
	// com o mesmo documento como se ela já existisse.
	const criadasDryRun = new Map();

	async function acharPessoa(documento) {
		if (criadasDryRun.has(documento)) return criadasDryRun.get(documento);
		return Pessoa.findOne({ documento });
	}

	// --- Integrantes de projeto ---
	const projetos = await Projeto.find({ 'integrantes.0': { $exists: true } }, 'nomeProjeto createdAt integrantes').sort({ createdAt: -1 }).lean();
	for (const projeto of projetos) {
		for (const integ of projeto.integrantes) {
			if (integ.pessoa) { resumo.jaVinculados++; continue; }
			const ref = { projeto: projeto.nomeProjeto, projetoId: String(projeto._id), tipo: integ.tipo, nome: integ.nome, email: integ.email, cpf: integ.cpf };

			const checagem = documentoValidator.validarDocumentoQualquerPais(integ.cpf);
			if (!checagem.valido) { relatorio.documentoInvalido.push(ref); continue; }
			const documento = checagem.normalizado;

			let pessoa = await acharPessoa(documento);
			if (pessoa) {
				if (!mesmoEmail(pessoa.email, integ.email) && !mesmoNome(pessoa.nome, integ.nome)) { relatorio.emailDiferenteDoCadastro.push(Object.assign({ emailCadastro: pessoa.email }, ref)); continue; }
			} else {
				const email = (integ.email || '').trim();
				if (!email) { relatorio.semEmail.push(ref); continue; }
				const outra = [...criadasDryRun.values()].find((p) => mesmoEmail(p.email, email)) || await Pessoa.findOne({ email: regexEmail(email) }, '_id documento');
				if (outra) { relatorio.emailDeOutraPessoa.push(Object.assign({ documentoDoDono: outra.documento }, ref)); continue; }

				const dados = { documento, nome: (integ.nome || '').trim(), email, telefone: integ.telefone, nacionalidade: integ.nacionalidade, createdAt: projeto.createdAt || Date.now() };
				if (DRY_RUN) {
					pessoa = Object.assign({ _id: 'dry-run' }, dados);
					criadasDryRun.set(documento, pessoa);
				} else {
					pessoa = await new Pessoa(dados).save();
				}
				resumo.integrantesPessoaCriada++;
			}

			if (!DRY_RUN) {
				await Projeto.updateOne({ _id: projeto._id }, { $set: { 'integrantes.$[i].pessoa': pessoa._id } }, { arrayFilters: [{ 'i._id': integ._id }], timestamps: false });
			}
			resumo.integrantesVinculados++;
		}
	}

	// --- Responsáveis de evento ---
	const eventos = await Evento.find({ 'responsavel.0': { $exists: true } }, 'titulo createdAt responsavel').lean();
	for (const evento of eventos) {
		for (const resp of evento.responsavel) {
			if (resp.pessoa) { resumo.jaVinculados++; continue; }
			const ref = { evento: evento.titulo, eventoId: String(evento._id), nome: resp.nome, cpf: resp.cpf };

			const checagem = documentoValidator.validarDocumentoQualquerPais(resp.cpf);
			if (!checagem.valido) { relatorio.documentoInvalido.push(ref); continue; }

			const pessoa = await acharPessoa(checagem.normalizado);
			if (!pessoa) { relatorio.responsavelSemCadastro.push(ref); continue; }

			if (!DRY_RUN) {
				await Evento.updateOne({ _id: evento._id }, { $set: { 'responsavel.$[r].pessoa': pessoa._id } }, { arrayFilters: [{ 'r._id': resp._id }] });
			}
			resumo.responsaveisVinculados++;
		}
	}

	console.log('\n--- Resumo' + (DRY_RUN ? ' (dry-run, nada foi gravado)' : '') + ' ---');
	console.log('Integrantes vinculados:', resumo.integrantesVinculados, '(Pessoas novas criadas:', resumo.integrantesPessoaCriada + ')');
	console.log('Responsáveis de evento vinculados:', resumo.responsaveisVinculados);
	console.log('Já estavam vinculados (pulados):', resumo.jaVinculados);
	console.log('Não vinculados:');
	console.log('  documento inválido:', relatorio.documentoInvalido.length);
	console.log('  integrante com e-mail diferente do cadastro da Pessoa:', relatorio.emailDiferenteDoCadastro.length);
	console.log('  integrante com e-mail que já é de outra Pessoa:', relatorio.emailDeOutraPessoa.length);
	console.log('  integrante sem e-mail:', relatorio.semEmail.length);
	console.log('  responsável sem Pessoa no cadastro (completar e-mail na tela do evento):', relatorio.responsavelSemCadastro.length);

	const relatorioPath = path.join(__dirname, `relatorio-vinculos-integrantes${DRY_RUN ? '-dry-run' : ''}.json`);
	fs.writeFileSync(relatorioPath, JSON.stringify(relatorio, null, 2));
	console.log('Relatório (contém nomes/e-mails, não commitar) salvo em', relatorioPath);
}

mongoose.connection.once('open', () => {
	migrar()
		.then(() => {
			console.log('\nConcluído.');
			mongoose.connection.close().then(() => process.exit(0));
		})
		.catch((err) => {
			console.error('Erro na migração:', err);
			mongoose.connection.close().then(() => process.exit(1));
		});
});
