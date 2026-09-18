'use strict';

// Extraído de controllers/admin-controller.js (era só usado ali, pro prazo global do
// singleton Admin) - agora reaproveitado também pelo prazo PRÓPRIO de cada Mostra
// (models/feira-schema.js, prazoProjetos/prazoAvaliadores - ver Fase 2, memória
// project-mostra-ano-nao-unico).
//
// Calcula o estágio atual (aberto / prorrogado / encerrado) de um prazo de inscrição.
// 'fallbackAtivo' é o boolean manual antigo (cadastro_projetos/cadastro_avaliadores do
// singleton Admin), usado só enquanto o admin não configurou um prazoProjetos/
// prazoAvaliadores novo - Feira não tem esse fallback (sempre veio com prazoProjetos/
// prazoAvaliadores desde a criação do campo).
module.exports.computaPrazo = (prazo, fallbackAtivo) => {
	var ativo = (prazo && prazo.ativo !== undefined) ? prazo.ativo : (fallbackAtivo !== undefined ? fallbackAtivo : true);
	if (!ativo) return { visivel: false, texto: (prazo && prazo.textoEncerrado) || '' };
	if (!prazo || !prazo.dataPrazo) return { visivel: true, texto: (prazo && prazo.textoPrazo) || '' };
	var agora = new Date();
	if (agora <= new Date(prazo.dataPrazo)) return { visivel: true, texto: prazo.textoPrazo || '' };
	if (prazo.dataProrrogacao && agora <= new Date(prazo.dataProrrogacao)) return { visivel: true, texto: prazo.textoProrrogacao || '' };
	return { visivel: false, texto: prazo.textoEncerrado || '' };
};
