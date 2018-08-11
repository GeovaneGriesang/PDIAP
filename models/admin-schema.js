'use strict';

const mongoose = require('mongoose')
,	Schema = mongoose.Schema;

const AdminSchema = new Schema({
	username: {
		type: String
	},
	password: {
		type: String
	},
	permissao: {
		type: String
	},
	dias: {
		type: String
	},
	mes: {
		type: String
	},
	ano: {
		type: String
	},
	edicao: {
		type: String	
	},
	text: {
		type: String
	},
	cadastro_projetos: {
		type: Boolean
	},
	cadastro_avaliadores: {
		type: Boolean
	}
}, { collection: 'adminCollection' });

const Avaliador = module.exports = mongoose.model('Admin', AdminSchema);
