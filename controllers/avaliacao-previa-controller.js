'use strict';

// Avaliação PRÉVIA dos trabalhos (aprovação pra apresentação e/ou anais), por Mostra - ver memória
// project-avaliacao-pelo-sistema. P1: configuração (Feira.avaliacaoPrevia), envio do texto (PDF) pelo
// projeto no painel e avaliadores(as) que se oferecem + aprovação da organização. Distribuição,
// convites e avaliação pela ficha (P2): controllers/distribuicao-previa-controller.js.

const path = require('path')
,	fs = require('fs');

// Arquivos FORA de public/ - só saem por rota com permissão (integrante, admin da Mostra e, na P2,
// quem recebeu o trabalho pra avaliar).
const PASTA = path.join(__dirname, '..', 'uploads', 'textos-previa');
module.exports.PASTA = PASTA;
module.exports.arquivoDoProjeto = (projetoId) => path.join(PASTA, String(projetoId) + '.pdf');
module.exports.garantirPasta = () => fs.promises.mkdir(PASTA, { recursive: true });

const data = (v) => { if (!v) return undefined; let d = new Date(v); return isNaN(d) ? undefined : d; };
const inteiro = (v, min, max, padrao) => { let n = parseInt(v, 10); return isNaN(n) ? padrao : Math.min(max, Math.max(min, n)); };
const texto = (v, max) => (v == null ? '' : String(v).slice(0, max || 5000));

// Configuração vinda do admin -> só campos conhecidos, com tipo e limites.
module.exports.limpar = (c) => {
	c = c || {};
	let fichas = (Array.isArray(c.fichas) ? c.fichas : []).slice(0, 30).map((f) => ({
		categoria: texto(f && f.categoria, 200),
		criterios: (Array.isArray(f && f.criterios) ? f.criterios : []).slice(0, 40)
			.map((k) => ({ nome: texto(k && k.nome, 300).trim(), maximo: inteiro(k && k.maximo, 0, 1000, 0) }))
			.filter((k) => k.nome && k.maximo > 0)
	})).filter((f) => f.categoria);
	return {
		ativa: c.ativa === true,
		envioInicio: data(c.envioInicio),
		envioPrazo: data(c.envioPrazo),
		instrucoesEnvio: texto(c.instrucoesEnvio),
		modo: c.modo === 'direto' ? 'direto' : 'convite',
		diasParaAceitar: inteiro(c.diasParaAceitar, 1, 60, 3),
		prazoAvaliacao: data(c.prazoAvaliacao),
		avaliadoresPorTrabalho: inteiro(c.avaliadoresPorTrabalho, 1, 10, 2),
		maxPorAvaliador: inteiro(c.maxPorAvaliador, 0, 200, 0),
		anonima: c.anonima !== false,
		contaNaFinal: c.contaNaFinal === true,
		instrucoesAvaliador: texto(c.instrucoesAvaliador),
		fichas: fichas
	};
};

// Ficha inicial da PARTE ESCRITA, tirada das fichas em papel (public/views/avaliacao-*.html):
// Fundamental = resumo (100); Médio/Técnico/Superior = relatório (50). A organização edita.
module.exports.fichaPadrao = (categoria) => {
	if (/fundamental/i.test(categoria)) {
		return [{ nome: 'Resumo do projeto (clareza, objetivos, metodologia e resultados)', maximo: 100 }];
	}
	return [
		{ nome: 'Itens pré-textuais (capa, folha de rosto, resumo, listas, sumário)', maximo: 4 },
		{ nome: 'Introdução', maximo: 7 }, { nome: 'Objetivos', maximo: 7 }, { nome: 'Referencial teórico', maximo: 7 },
		{ nome: 'Metodologia', maximo: 7 }, { nome: 'Resultados e discussões', maximo: 7 }, { nome: 'Considerações finais', maximo: 7 },
		{ nome: 'Referências bibliográficas', maximo: 4 }
	];
};

// Configuração da Mostra pra tela (com fichas iniciais pras categorias que ainda não têm).
module.exports.paraTela = (mostra) => {
	let c = (mostra && mostra.avaliacaoPrevia) || {};
	let categorias = ((mostra && mostra.categoriasEixos) || []).map((ce) => ce.categoria).filter(Boolean);
	categorias = [...new Set(categorias)];
	let fichas = categorias.map((cat) => {
		let existente = (c.fichas || []).find((f) => f.categoria === cat);
		return { categoria: cat, criterios: existente && existente.criterios.length ? existente.criterios : module.exports.fichaPadrao(cat), padrao: !existente };
	});
	return {
		ativa: !!c.ativa, envioInicio: c.envioInicio, envioPrazo: c.envioPrazo, instrucoesEnvio: c.instrucoesEnvio || '',
		modo: c.modo || 'convite', diasParaAceitar: c.diasParaAceitar || 3, prazoAvaliacao: c.prazoAvaliacao,
		avaliadoresPorTrabalho: c.avaliadoresPorTrabalho || 2, maxPorAvaliador: c.maxPorAvaliador || 0, anonima: c.anonima !== false, contaNaFinal: !!c.contaNaFinal,
		instrucoesAvaliador: c.instrucoesAvaliador || '', fichas: fichas, categoriasCadastradas: categorias.length
	};
};

// Envio do texto pelo projeto: aberto agora?
module.exports.situacaoEnvio = (mostra) => {
	let c = (mostra && mostra.avaliacaoPrevia) || {};
	if (!c.ativa) return { ativa: false };
	let agora = new Date();
	let aberto = (!c.envioInicio || agora >= new Date(c.envioInicio)) && (!c.envioPrazo || agora <= new Date(c.envioPrazo));
	let motivo = null;
	if (c.envioInicio && agora < new Date(c.envioInicio)) motivo = 'O envio do texto abre em ' + new Date(c.envioInicio).toLocaleDateString('pt-BR') + '.';
	else if (c.envioPrazo && agora > new Date(c.envioPrazo)) motivo = 'O prazo de envio do texto terminou em ' + new Date(c.envioPrazo).toLocaleDateString('pt-BR') + '.';
	return { ativa: true, aberto: aberto, motivo: motivo, envioInicio: c.envioInicio, envioPrazo: c.envioPrazo, instrucoes: c.instrucoesEnvio || '' };
};
