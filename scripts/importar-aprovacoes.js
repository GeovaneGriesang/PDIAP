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
const autoresPorNumero = require('./aprovacoes-2026-autores.json').autoresPorNumero;
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

// Casamento por AUTORES: o título costuma ser reescrito entre o sistema de submissão
// dos textos e a inscrição no MOVACI, mas os integrantes são os mesmos. Só vale quando
// UM único projeto do ano tem sobreposição forte de autores - se dois projetos empatam,
// devolve null e o caso vai pra revisão manual em vez de arriscar o trabalho errado.
function casarPorAutores(autores, projetosDoAno) {
	if (!autores || !autores.length) return null;

	const alvo = autores.map(normalizar).filter(Boolean);
	const pontuados = projetosDoAno.map(function(p) {
		const integrantes = (p.integrantes || []).map(function(i) { return normalizar(i.nome); }).filter(Boolean);
		const encontrados = alvo.filter(function(a) {
			return integrantes.some(function(i) { return i === a || i.indexOf(a) !== -1 || a.indexOf(i) !== -1; });
		}).length;
		return { projeto: p, encontrados: encontrados, proporcao: encontrados / alvo.length };
	}).filter(function(x) { return x.encontrados >= 2 || (alvo.length === 1 && x.encontrados === 1); });

	if (!pontuados.length) return null;
	pontuados.sort(function(a, b) { return b.proporcao - a.proporcao || b.encontrados - a.encontrados; });

	// Empate no topo = ambíguo, não casa.
	if (pontuados.length > 1 && pontuados[1].proporcao === pontuados[0].proporcao && pontuados[1].encontrados === pontuados[0].encontrados) return null;
	// Metade dos autores tem que bater, senão é coincidência de orientador em comum.
	if (pontuados[0].proporcao < 0.5) return null;
	return pontuados[0].projeto;
}

function contarPor(itens, campo) {
	const contagem = {};
	itens.forEach(function(i) { contagem[i[campo]] = (contagem[i[campo]] || 0) + 1; });
	return contagem;
}

async function importar() {
	const todos = await Projeto.find({}, 'nomeProjeto numInscricao createdAt aprovado tipoAprovacao modalidade integrantes');
	const doAno = todos.filter(function(p) { return new Date(p.createdAt).getFullYear() === ANO; });

	// Índice por título normalizado. Título repetido no mesmo ano (o grupo se inscreveu
	// duas vezes) fica registrado como ambíguo e é resolvido mais abaixo por autores ou,
	// em último caso, pela inscrição mais recente.
	const porTitulo = new Map();
	doAno.forEach(function(p) {
		const chave = normalizar(p.nomeProjeto);
		if (!porTitulo.has(chave)) porTitulo.set(chave, []);
		porTitulo.get(chave).push(p);
	});

	const maisRecente = function(projetos) {
		return projetos.slice().sort(function(a, b) { return new Date(b.createdAt) - new Date(a.createdAt); })[0];
	};

	const casados = [];
	const naoCasaram = [];
	const idsCasados = new Set();

	// O casamento é feito em passadas, da evidência mais forte pra mais fraca. Isso
	// importa porque um grupo pode ter submetido DOIS trabalhos (ex: o mesmo tema como
	// resumo expandido e como artigo): os autores são idênticos nos dois, então casar
	// por autor antes de esgotar os títulos faria um trabalho "roubar" o projeto do
	// outro.
	const registrar = function(trabalho, projeto, comoCasou) {
		idsCasados.add(projeto._id.toString());
		casados.push({
			numero: trabalho.numero,
			tituloPdf: trabalho.titulo,
			tituloBanco: projeto.nomeProjeto,
			numInscricao: projeto.numInscricao,
			modalidade: trabalho.modalidade,
			situacao: trabalho.situacao,
			comoCasou: comoCasou
		});
		return { _id: projeto._id, trabalho: trabalho };
	};

	const pendentes = lista.trabalhos.slice();
	const aGravar = [];

	// Passada 1 - título único no ano.
	for (let i = pendentes.length - 1; i >= 0; i--) {
		const trabalho = pendentes[i];
		const mesmoTitulo = (porTitulo.get(normalizar(trabalho.titulo)) || []).filter(function(p) { return !idsCasados.has(p._id.toString()); });
		if (mesmoTitulo.length === 1) {
			aGravar.push(registrar(trabalho, mesmoTitulo[0], 'titulo'));
			pendentes.splice(i, 1);
		}
	}

	// Passada 2 - mesmo título em mais de um projeto (grupo se inscreveu duas vezes):
	// desempata por autores; se não der, fica a inscrição mais recente (decisão do
	// usuário - a segunda costuma ser a correção da primeira).
	for (let i = pendentes.length - 1; i >= 0; i--) {
		const trabalho = pendentes[i];
		const mesmoTitulo = (porTitulo.get(normalizar(trabalho.titulo)) || []).filter(function(p) { return !idsCasados.has(p._id.toString()); });
		if (mesmoTitulo.length > 1) {
			const porAutor = casarPorAutores(autoresPorNumero[trabalho.numero], mesmoTitulo);
			aGravar.push(registrar(trabalho, porAutor || maisRecente(mesmoTitulo), porAutor ? 'titulo duplicado, resolvido por autores' : 'titulo duplicado, resolvido pela inscrição mais recente'));
			pendentes.splice(i, 1);
		}
	}

	// Passada 3 - título reescrito entre os dois sistemas: casa pelos autores, só entre
	// os projetos que sobraram.
	for (let i = pendentes.length - 1; i >= 0; i--) {
		const trabalho = pendentes[i];
		const disponiveis = doAno.filter(function(p) { return !idsCasados.has(p._id.toString()); });
		const porAutor = casarPorAutores(autoresPorNumero[trabalho.numero], disponiveis);
		if (porAutor) {
			aGravar.push(registrar(trabalho, porAutor, 'autores'));
			pendentes.splice(i, 1);
		}
	}

	pendentes.forEach(function(trabalho) {
		const autores = autoresPorNumero[trabalho.numero];
		naoCasaram.push({
			numero: trabalho.numero,
			titulo: trabalho.titulo,
			modalidade: trabalho.modalidade,
			situacao: trabalho.situacao,
			autores: autores || null,
			motivo: autores ? 'nem o título nem os autores casaram' : 'nenhum projeto com esse título (autores não transcritos)',
			candidatos: candidatosParecidos(normalizar(trabalho.titulo), doAno, 3)
		});
	});

	if (!DRY_RUN) {
		for (const item of aGravar) {
			await Projeto.updateOne({ _id: item._id }, { $set: {
				aprovado: true,
				tipoAprovacao: item.trabalho.situacao,
				modalidade: item.trabalho.modalidade
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
	console.log('Casaram:', casados.length, JSON.stringify(contarPor(casados, 'comoCasou')));
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
