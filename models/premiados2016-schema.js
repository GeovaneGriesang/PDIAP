'use strict';

const mongoose = require('mongoose')
,	Schema = mongoose.Schema;

const IntegranteSchema = new Schema({
	tipo: {type: String},
	nome: {type: String},
	email: {type: String},
	cpf: {type: String},
	telefone: {type: String},
	tamCamiseta: {type: String},
	presenca: {type: Boolean}
});

const premiadoSchema = new Schema({
	numInscricao: {type: String},
	nomeProjeto: {type: String},
	categoria: {type: String},
	eixo: {type: String},
	hospedagem: {type: String},

	nomeEscola: {type: String},
	cep: {type: String},
	cidade: {type: String},
	estado: {type: String},


	username: {type: String, required: true, unique: true, uniqueCaseInsensitive:true},
	email: {type: String, required: true},
	password: {type: String, required: true},
	permissao: {type: String},
	aprovado: {type: Boolean},
	participa: {type: Boolean},
	participa_updated: {type: Boolean},

	createdAt: {type: Date},
	updatedAt: {type: Date},

	resetPasswordToken: {type: String},
    resetPasswordCreatedDate: {type: Date},

	integrantes: [IntegranteSchema],

	resumo: {type: String},
	palavraChave: {type: String},
	avaliacao: {type: Array},
  colocacao: {type: String},
  mostratec: {type: Boolean},
	token: {type:String}

}, { collection: 'premiados2016' });

const Premiado = module.exports = mongoose.model('Premiado', premiadoSchema);
