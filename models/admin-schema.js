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
	}
}, { collection: 'adminCollection' });

const Avaliador = module.exports = mongoose.model('Admin', AdminSchema);
