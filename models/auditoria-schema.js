'use strict';

const mongoose = require('mongoose')
,	Schema = mongoose.Schema;

// Auditoria (reunião de 20/10/2026): uma linha por alteração feita por alguém logado no admin ou no
// Meu painel (toda requisição que não é leitura) - quem, quando, o quê, em qual Mostra e se deu certo.
// Gravada por utils/auditoria.js; só super-admin vê (Sistema > Auditoria). Só existe a partir de
// 2026-10-29: o que aconteceu antes não foi registrado.
const AuditoriaSchema = new Schema({
	quando: {type: Date, default: Date.now, index: true},
	pessoa: {type: Schema.Types.ObjectId, ref: 'Pessoa', index: true},
	nome: {type: String},
	email: {type: String},
	origem: {type: String}, // 'admin' | 'painel'
	metodo: {type: String},
	rota: {type: String},
	acao: {type: String}, // descrição legível (utils/auditoria.js#ACOES), quando conhecida
	status: {type: Number},
	feiraId: {type: Schema.Types.ObjectId, ref: 'Feira'},
	alvo: {type: String}, // nome/título/nº do que foi alterado, quando vem na requisição
	detalhes: {type: String}, // corpo da requisição, sem senhas/tokens, cortado
	ip: {type: String}
}, { collection: 'auditoria' });

module.exports = mongoose.model('Auditoria', AuditoriaSchema);
