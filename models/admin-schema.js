'use strict';

const mongoose = require('mongoose')
,	Schema = mongoose.Schema;

const opcoesSchema = new Schema({	
	instituicao: {type: Boolean},
	integrantes: {type: Boolean},
	hospedagem: {type: Boolean},
	nomeProjeto: {type: Boolean},
	palavras_chave: {type: Boolean},
	categoria: {type: Boolean},
	eixo: {type: Boolean},
	participa: {type: Boolean},
	resumo: {type: Boolean}
});

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
	},
	saberes_docentes: {
		type: Boolean
	},
	opcoes: opcoesSchema
}, { collection: 'adminCollection' });

const Avaliador = module.exports = mongoose.model('Admin', AdminSchema);
