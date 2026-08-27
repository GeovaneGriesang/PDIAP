'use strict';

const mongoose = require('mongoose')
,	Schema = mongoose.Schema;

// Cadastro formal de escolas: substitui o texto livre que cada projeto digitava em
// nomeEscola (anos de dados com a mesma escola grafada de dezenas de formas
// diferentes). Projetos passam a referenciar uma Escola (ver projeto-schema.js#escola),
// selecionada de uma lista em vez de digitada.
//
// status 'pendente': criada via solicitação (inline na inscrição de projeto ou pelo
// formulário público standalone) - ainda não aparece na lista de seleção até o admin
// aprovar (e, se precisar, corrigir nome/cidade/estado antes de aprovar).
// status 'aprovada': visível na lista de seleção do cadastro de projeto.
const EscolaSchema = new Schema({
	nome: {type: String, required: true},
	cep: {type: String},
	cidade: {type: String},
	estado: {type: String},
	status: {type: String, enum: ['aprovada', 'pendente'], default: 'pendente'},
	origem: {type: String, enum: ['admin', 'inline_inscricao', 'formulario_publico', 'migracao'], required: true},
	solicitanteNome: {type: String},
	solicitanteEmail: {type: String},
	projetoOrigem: {type: Schema.Types.ObjectId, ref: 'Projeto'},
	createdAt: {type: Date, default: Date.now},
	aprovadaEm: {type: Date},
	aprovadaPor: {type: String}
}, { collection: 'escolas' });

const Escola = module.exports = mongoose.model('Escola', EscolaSchema);
