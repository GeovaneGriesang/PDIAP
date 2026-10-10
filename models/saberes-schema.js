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
	// Pessoa do cadastro único (models/pessoa-schema.js) - ver pessoaController.vincularPessoa.
	pessoa: { type: Schema.Types.ObjectId, ref: 'Pessoa' },
	createdAt: {
		type: Date
	}
//}, { collection: 'saberesCollection' });
 }, { collection: 'saberes2016' });

const Saberes = module.exports = mongoose.model('Saberes', SaberesSchema);
