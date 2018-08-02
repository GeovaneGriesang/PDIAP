'use strict';

const mongoose = require('mongoose')
,	Schema = mongoose.Schema;

const SaberesSchema = new Schema({
	tipo: {
		type: String
	},
	nome: {
		type: String
	},
	email: {
		type: String
	},
	cpf: {
		type: String
	},
	telefone: {
		type: String
	},
	escola: {
		type: String
	},
	resumo: {
		type: String
	},
	cargaHoraria: {
		type: String
	},
	createdAt: {
		type: Date
	}
//}, { collection: 'saberesCollection' });
 }, { collection: 'saberes2016' });

const Saberes = module.exports = mongoose.model('Saberes', SaberesSchema);
