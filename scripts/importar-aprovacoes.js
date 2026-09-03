'use strict';

// Importa a lista oficial de trabalhos aprovados (scripts/aprovacoes-2026.json,
// transcrita do PDF da comissão) pro banco, e normaliza as edições anteriores.
//
// O Nº do PDF vem do sistema de submissão dos textos, NÃO é o numInscricao do MOVACI -
// por isso o casamento é feito pelo TÍTULO normalizado (sem acento, minúsculo, só
// alfanumérico). O que não casar NÃO é adivinhado: entra no relatório com os títulos
// mais parecidos do banco ao lado, pra decisão manual.
//
// O que o script faz:
//   1. Casou     -> aprovado:true + tipoAprovacao ('anais'|'apresentacao') + modalidade.
//   2. Não casou -> só relatório (nada é gravado).
//   3. Projeto do ano da lista que NÃO está nela -> aprovado:false (decisão do usuário).
//   4. Anos anteriores com aprovado===true e sem tipoAprovacao -> 'anais' (idem).
//
// Idempotente: rodar de novo grava os mesmos valores.
//
// Uso:
//   node scripts/importar-aprovacoes.js --dry-run   (só relata, não grava)
//   node scripts/importar-aprovacoes.js             (grava)
//
// Antes de rodar em produção: back-up primeiro (scripts/backup-colecao.js projeto-schema).

require('dotenv').config();

const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
require('../configs/db-config');
const Projeto = require('../models/projeto-schema');

const DRY_RUN = process.argv.includes('--dry-run');
const lista = require('./aprovacoes-2026.json');
const ANO = 2026;

// Construído a partir de string escapada de propósito: os caracteres combinantes
// (acentos separados que o NFD gera) são invisíveis se escritos direto no fonte.
const DIACRITICOS = new RegExp('[\\u0300-\\u036f]', 'g');

function normalizar(titulo) {
	return (titulo || '').toString()
		.normalize('NFD').replace(DIACRITICOS, '')
		.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

// Distância de edição só pra SUGERIR candidatos no relatório dos não-casados - nunca
// pra casar automaticamente (casar por aproximação arriscaria aprovar o trabalho errado).
function distancia(a, b) {
	if (a === b) return 0;
	if (!a.length) return b.length;
	if (!b.length) return a.length;
	let anterior = new Array(b.length + 1);
	for (let j = 0; j <= b.length; j++) anterior[j] = j;
	for (let i = 1; i <= a.length; i++) {
		let atual = [i];
		for (let j = 1; j <= b.length; j++) {
			const custo = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
			atual[j] = Math.min(atual[j - 1] + 1, anterior[j] + 1, anterior[j - 1] + custo);
		}
		anterior = atual;
	}
	return anterior[b.length];
}

function candidatosParecidos(tituloNormalizado, projetosDoAno, quantos) {
	return projetosDoAno
		.map(function(p) {
			const d = distancia(tituloNormalizado, normalizar(p.nomeProjeto));
			const maior = Math.max(tituloNormalizado.length, normalizar(p.nomeProjeto).length) || 1;
			return { nomeProjeto: p.nomeProjeto, numInscricao: p.numInscricao, semelhanca: +(1 - d / maior).toFixed(2) };
		})
		.sort(function(a, b) { return b.semelhanca - a.semelhanca; })
		.slice(0, quantos);
}

function contarPor(itens, campo) {
	const contagem = {};
	itens.forEach(function(i) { contagem[i[campo]] = (contagem[i[campo]] || 0) + 1; });
	return contagem;
}

async function importar() {
	const todos = await Projeto.find({}, 'nomeProjeto numInscricao createdAt aprovado tipoAprovacao modalidade');
	const doAno = todos.filter(function(p) { return new Date(p.createdAt).getFullYear() === ANO; });

	// Índice por título normalizado. Título repetido no mesmo ano é registrado como
	// ambíguo e tratado como "não casou" - não dá pra saber qual dos dois é.
	const porTitulo = new Map();
	const titulosAmbiguos = new Set();
	doAno.forEach(function(p) {
		const chave = normalizar(p.nomeProjeto);
		if (porTitulo.has(chave)) titulosAmbiguos.add(chave);
		else porTitulo.set(chave, p);
	});

	const casados = [];
	const naoCasaram = [];
	const idsCasados = new Set();

	for (const trabalho of lista.trabalhos) {
		const chave = normalizar(trabalho.titulo);
		const projeto = titulosAmbiguos.has(chave) ? null : porTitulo.get(chave);

		if (!projeto) {
			naoCasaram.push({
				numero: trabalho.numero,
				titulo: trabalho.titulo,
				modalidade: trabalho.modalidade,
				situacao: trabalho.situacao,
				motivo: titulosAmbiguos.has(chave) ? 'mais de um projeto com esse mesmo título no ano' : 'nenhum projeto com esse título',
				candidatos: candidatosParecidos(chave, doAno, 3)
			});
			continue;
		}

		idsCasados.add(projeto._id.toString());
		casados.push({
			numero: trabalho.numero,
			titulo: projeto.nomeProjeto,
			numInscricao: projeto.numInscricao,
			modalidade: trabalho.modalidade,
			situacao: trabalho.situacao
		});

		if (!DRY_RUN) {
			await Projeto.updateOne({ _id: projeto._id }, { $set: {
				aprovado: true,
				tipoAprovacao: trabalho.situacao,
				modalidade: trabalho.modalidade
			}});
		}
	}

	// Inscritos do ano que não estão na lista oficial viram não aprovados.
	const foraDaLista = doAno.filter(function(p) { return !idsCasados.has(p._id.toString()); });
	if (!DRY_RUN) {
		for (const p of foraDaLista) {
			await Projeto.updateOne({ _id: p._id }, { $set: { aprovado: false }, $unset: { tipoAprovacao: true } });
		}
	}

	// Edições anteriores: aprovado sem tipo definido = "apresentação e publicação nos anais".
	const anterioresPendentes = todos.filter(function(p) {
		return new Date(p.createdAt).getFullYear() < ANO && p.aprovado === true && !p.tipoAprovacao;
	});
	if (!DRY_RUN) {
		for (const p of anterioresPendentes) {
			await Projeto.updateOne({ _id: p._id }, { $set: { tipoAprovacao: 'anais' } });
		}
	}

	const esperado = lista._totaisEsperados || {};
	const porModalidade = contarPor(casados, 'modalidade');
	const porSituacao = contarPor(casados, 'situacao');

	console.log('\n--- Importação da lista oficial' + (DRY_RUN ? ' (dry-run, nada foi gravado)' : '') + ' ---');
	console.log('Trabalhos na lista oficial:', lista.trabalhos.length, '(esperado:', esperado.total + ')');
	console.log('Projetos inscritos em ' + ANO + ':', doAno.length);
	console.log('Casaram pelo título:', casados.length);
	console.log('NÃO casaram (precisam de revisão manual):', naoCasaram.length);
	console.log('Inscritos fora da lista -> não aprovados:', foraDaLista.length);
	console.log('Edições anteriores normalizadas para "anais":', anterioresPendentes.length);
	console.log('\nPor modalidade (casados):', JSON.stringify(porModalidade));
	console.log('Esperado pelo PDF:        ', JSON.stringify({
		'Resumo Simples': esperado['Resumo Simples'],
		'Resumo Expandido': esperado['Resumo Expandido'],
		'Artigo': esperado['Artigo']
	}));
	console.log('Por situação (casados):', JSON.stringify(porSituacao));

	const relatorioPath = path.join(__dirname, `relatorio-importacao-aprovacoes${DRY_RUN ? '-dry-run' : ''}.json`);
	fs.writeFileSync(relatorioPath, JSON.stringify({
		resumo: {
			listaOficial: lista.trabalhos.length,
			inscritosNoAno: doAno.length,
			casados: casados.length,
			naoCasaram: naoCasaram.length,
			foraDaLista: foraDaLista.length,
			anterioresNormalizadas: anterioresPendentes.length,
			porModalidade: porModalidade,
			porSituacao: porSituacao
		},
		naoCasaram: naoCasaram,
		foraDaLista: foraDaLista.map(function(p) { return { numInscricao: p.numInscricao, nomeProjeto: p.nomeProjeto }; }),
		casados: casados
	}, null, 2));
	console.log('\nRelatório salvo em', relatorioPath);
}

mongoose.connection.once('open', function() {
	importar()
		.then(function() {
			console.log('\nImportação concluída.');
			mongoose.connection.close(function() { process.exit(0); });
		})
		.catch(function(err) {
			console.error('Erro na importação:', err);
			mongoose.connection.close(function() { process.exit(1); });
		});
});
