'use strict';

// Migração pro cadastro formal de escolas (ver models/escola-schema.js). Consolida
// nomeEscola (texto livre, dezenas de grafias diferentes pra mesma escola ao longo dos
// anos) usando o mapeamento scripts/mapeamento-escolas.json, curado manualmente a
// partir dos dados reais.
//
// Cidade/estado de cada Escola vêm do campo cidade/estado do PRÓPRIO projeto (não do
// nome digitado) - a mais frequente entre os projetos do grupo, com divergência
// registrada no relatório quando não é unânime.
//
// Caso especial "IFSul – Não Especificado": esses projetos não dizem o câmpus, mas cada
// um já tem sua própria cidade/estado. Antes de cair no grupo genérico, cada projeto é
// checado individualmente contra a cidade dos câmpus IFSul/IFRS já resolvidos nesta
// mesma migração - se bater, o projeto é linkado a ESSE câmpus específico em vez de
// "Não Especificado". Só sobra no genérico quem tem uma cidade que não corresponde a
// nenhum câmpus conhecido.
//
// Idempotente: projeto que já tem `escola` setado é pulado - seguro rodar de novo.
//
// Uso:
//   node scripts/migrar-escolas.js --dry-run   (só imprime o que faria, não grava nada)
//   node scripts/migrar-escolas.js             (roda de verdade)
//
// Antes de rodar em produção: back-up (mongodump) primeiro.

require('dotenv').config();

const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
require('../configs/db-config');
const Projeto = require('../models/projeto-schema');
const Escola = require('../models/escola-schema');

const DRY_RUN = process.argv.includes('--dry-run');
const mapeamento = require('./mapeamento-escolas.json');

function normalizar(texto) {
	return (texto || '').toString().trim().replace(/\s+/g, ' ').toLowerCase();
}

// variante normalizada -> grupo (inclui o próprio nome canônico como variante de si
// mesmo, útil quando um projeto já foi cadastrado com a grafia "correta").
const grupoPorVariante = new Map();
mapeamento.grupos.forEach(function(grupo) {
	grupoPorVariante.set(normalizar(grupo.canonico), grupo);
	grupo.variantes.forEach(function(v) { grupoPorVariante.set(normalizar(v), grupo); });
});

const grupoNaoEspecificado = mapeamento.grupos.find(function(g) { return g.resolverPorCidadeDoProjeto; });

// Escolhe a combinação cidade/estado mais frequente entre uma lista de projetos.
// Retorna também o mapa completo de contagens, pra quem quiser detectar divergência.
function escolherCidadeEstado(projetos) {
	const contagem = new Map();
	projetos.forEach(function(p) {
		const chave = (p.cidade || '') + '|' + (p.estado || '');
		contagem.set(chave, (contagem.get(chave) || 0) + 1);
	});
	let escolhida = null, maior = -1;
	for (const [chave, n] of contagem) {
		if (n > maior) { maior = n; escolhida = chave; }
	}
	const [cidade, estado] = (escolhida || '|').split('|');
	return { cidade: cidade || undefined, estado: estado || undefined, contagemPorCombinacao: contagem, vencedora: maior };
}

async function migrar() {
	const todos = await Projeto.find({}, 'nomeEscola cidade estado escola');

	// Anomalia de dados pré-existente (não relacionada a esta migração): pelo menos um
	// projeto no banco tem _id null - não dá pra salvar nem referenciar isso com
	// segurança, então fica de fora e é reportado à parte, não silenciosamente
	// ignorado.
	const semIdValido = todos.filter(function(p) { return !p._id; });
	const projetos = todos.filter(function(p) { return p._id; });

	const projetosJaLinkados = projetos.filter(function(p) { return p.escola; }).length;
	const pendentes = projetos.filter(function(p) { return !p.escola; });

	// 1) Agrupa por nome canônico (exceto o grupo especial "Não Especificado", tratado
	// à parte depois de resolver os demais).
	const gruposComProjetos = new Map(); // canonico -> { grupo, projetos: [] }
	const semCorrespondencia = new Map(); // nomeEscola original -> contagem
	const projetosNaoEspecificado = [];

	for (const proj of pendentes) {
		const chave = normalizar(proj.nomeEscola);
		const grupo = grupoPorVariante.get(chave);
		if (!grupo) {
			const original = proj.nomeEscola || '(vazio)';
			semCorrespondencia.set(original, (semCorrespondencia.get(original) || 0) + 1);
			continue;
		}
		if (grupo.resolverPorCidadeDoProjeto) {
			projetosNaoEspecificado.push(proj);
			continue;
		}
		if (!gruposComProjetos.has(grupo.canonico)) gruposComProjetos.set(grupo.canonico, { grupo: grupo, projetos: [] });
		gruposComProjetos.get(grupo.canonico).projetos.push(proj);
	}

	let escolasCriadas = 0, projetosLinkados = 0;
	const divergenciasCidade = [];
	const cidadeCampusPorNome = new Map(); // canonico -> {cidade, estado} - só campi IFSul/IFRS, pro passo 2

	// 2) Cria/linka os grupos normais, registrando a cidade de cada câmpus IFSul/IFRS
	// resolvido (pra usar no passo 3).
	for (const [canonico, dados] of gruposComProjetos) {
		const { cidade, estado, contagemPorCombinacao } = escolherCidadeEstado(dados.projetos);

		if (contagemPorCombinacao.size > 1) {
			divergenciasCidade.push({
				escola: canonico,
				totalProjetos: dados.projetos.length,
				escolhido: { cidade: cidade, estado: estado },
				todasAsCombinacoes: Array.from(contagemPorCombinacao.entries()).map(function([chave, n]) {
					const [c, e] = chave.split('|');
					return { cidade: c || '(vazio)', estado: e || '(vazio)', projetos: n };
				})
			});
		}

		// Só campus de verdade entram como alvo de resolução por cidade - grupos tipo
		// "IFSUL – Projeto Partiu IF" (programa, não campus físico) começam com
		// "IFSUL" mas não têm "câmpus/campus" no nome, e não deveriam roubar
		// projetos genéricos que na verdade são de um câmpus normal na mesma cidade.
		if (/^(ifsul|ifrs)\b.*\b(c[aâ]mpus)\b/i.test(canonico) && cidade) {
			cidadeCampusPorNome.set(normalizar(cidade), canonico);
		}

		let escolaId;
		if (DRY_RUN) {
			console.log(`[dry-run] criaria Escola nome="${canonico}" cidade="${cidade || ''}" estado="${estado || ''}" (${dados.projetos.length} projeto(s))`);
		} else {
			const escola = new Escola({ nome: canonico, cidade: cidade, estado: estado, status: 'aprovada', origem: 'migracao' });
			await escola.save();
			escolaId = escola._id;
		}
		escolasCriadas++;

		for (const proj of dados.projetos) {
			if (DRY_RUN) {
				console.log(`[dry-run] linkaria Projeto ${proj._id} (nomeEscola="${proj.nomeEscola}") -> Escola "${canonico}"`);
			} else {
				proj.escola = escolaId;
				proj.nomeEscola = canonico;
				await proj.save();
			}
			projetosLinkados++;
		}
	}

	// 3) "IFSul – Não Especificado": tenta resolver cada projeto individualmente pela
	// cidade dele contra os câmpus IFSul/IFRS já resolvidos acima; o que sobrar cai no
	// grupo genérico mesmo.
	const resolvidosPorCidade = []; // {projeto, campus} - pro relatório
	const semCampusEncontrado = [];
	for (const proj of projetosNaoEspecificado) {
		const campus = cidadeCampusPorNome.get(normalizar(proj.cidade));
		if (campus) {
			resolvidosPorCidade.push({ projetoId: proj._id.toString(), cidade: proj.cidade, campus: campus });
			if (DRY_RUN) {
				console.log(`[dry-run] "IFSul não especificado" -> resolvido pela cidade "${proj.cidade}": Projeto ${proj._id} -> Escola "${campus}"`);
			} else {
				const escola = await Escola.findOne({ nome: campus, origem: 'migracao' });
				proj.escola = escola._id;
				proj.nomeEscola = campus;
				await proj.save();
			}
			projetosLinkados++;
		} else {
			semCampusEncontrado.push(proj);
		}
	}

	if (semCampusEncontrado.length > 0 && grupoNaoEspecificado) {
		const canonico = grupoNaoEspecificado.canonico;
		const { cidade, estado } = escolherCidadeEstado(semCampusEncontrado);
		let escolaId;
		if (DRY_RUN) {
			console.log(`[dry-run] criaria Escola nome="${canonico}" cidade="${cidade || ''}" estado="${estado || ''}" (${semCampusEncontrado.length} projeto(s), sem câmpus identificável pela cidade)`);
		} else {
			const escola = new Escola({ nome: canonico, cidade: cidade, estado: estado, status: 'aprovada', origem: 'migracao' });
			await escola.save();
			escolaId = escola._id;
		}
		escolasCriadas++;
		for (const proj of semCampusEncontrado) {
			if (DRY_RUN) {
				console.log(`[dry-run] linkaria Projeto ${proj._id} (cidade="${proj.cidade}") -> Escola "${canonico}" (genérico)`);
			} else {
				proj.escola = escolaId;
				proj.nomeEscola = canonico;
				await proj.save();
			}
			projetosLinkados++;
		}
	}

	console.log('\n--- Resumo da migração' + (DRY_RUN ? ' (dry-run, nada foi gravado)' : '') + ' ---');
	console.log('Escolas criadas:', escolasCriadas);
	console.log('Projetos linkados agora:', projetosLinkados);
	console.log('Projetos que já estavam linkados (pulados):', projetosJaLinkados);
	console.log('"IFSul não especificado" resolvido pela cidade pra um câmpus específico:', resolvidosPorCidade.length);
	console.log('"IFSul não especificado" sem câmpus identificável (ficou genérico):', semCampusEncontrado.length);
	const totalSemCorrespondencia = Array.from(semCorrespondencia.values()).reduce(function(a, b) { return a + b; }, 0);
	console.log('Projetos sem correspondência no mapeamento:', totalSemCorrespondencia, '(' + semCorrespondencia.size + ' grafia(s) distinta(s))');
	console.log('Grupos com cidade/estado divergente entre projetos:', divergenciasCidade.length);
	if (semIdValido.length > 0) {
		console.log('ATENÇÃO: ' + semIdValido.length + ' projeto(s) com _id nulo no banco (anomalia pré-existente, não relacionada a esta migração) - ficaram de fora, ver relatório.');
	}

	const contagemPorEscola = Array.from(gruposComProjetos.entries())
		.map(function([canonico, dados]) { return { escola: canonico, total: dados.projetos.length }; })
		.sort(function(a, b) { return b.total - a.total; });

	const relatorioPath = path.join(__dirname, `relatorio-migracao-escolas${DRY_RUN ? '-dry-run' : ''}.json`);
	fs.writeFileSync(relatorioPath, JSON.stringify({
		contagemPorEscola: contagemPorEscola,
		naoEspecificadoResolvidoPorCidade: resolvidosPorCidade,
		naoEspecificadoGenerico: semCampusEncontrado.map(function(p) { return { projetoId: p._id.toString(), nomeEscola: p.nomeEscola, cidade: p.cidade, estado: p.estado }; }),
		semCorrespondencia: Array.from(semCorrespondencia.entries()).map(function([nome, total]) { return { nomeEscola: nome, total: total }; }).sort(function(a, b) { return b.total - a.total; }),
		divergenciasCidade: divergenciasCidade,
		projetosComIdNuloAnomaliaPreExistente: semIdValido.map(function(p) { return { nomeEscola: p.nomeEscola, cidade: p.cidade, estado: p.estado }; })
	}, null, 2));
	console.log('Relatório salvo em', relatorioPath);
}

mongoose.connection.once('open', function() {
	migrar()
		.then(function() {
			console.log('\nMigração concluída.');
			mongoose.connection.close(function() { process.exit(0); });
		})
		.catch(function(err) {
			console.error('Erro na migração:', err);
			mongoose.connection.close(function() { process.exit(1); });
		});
});
