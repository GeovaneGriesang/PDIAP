'use strict';

const mongoose = require('mongoose')
,	Schema = mongoose.Schema;

const AvaliadorSchema = new Schema({
	nome: {
		type: String
	},
	email: {
		type: String
	},
	cpf: {
		type: String
	},
	rg: {
		type: String
	},
	dtNascimento: {
		type: String
	},
	nivelAcademico: {
		type: String
	},
	categoria: {
		type: String
	},
	eixo: {
		type: String
	},
	atuacaoProfissional: {
		type: String
	},
	tempoAtuacao: {
		type: String
	},
	telefone: {
		type: String
	},
	curriculo: {
		type: String
	},
	turnos: {
		type: String
	},
	token: {
		type: String
	}
// }, { collection: 'avaliadorCollection' });
}, { collection: 'avaliadorCollection2017' });

const Avaliador = module.exports = mongoose.model('Avaliador', AvaliadorSchema);
