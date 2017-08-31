'use strict';

const mongoose = require('mongoose')
,	bcrypt = require('bcryptjs')
,	autoIncrement = require('mongoose-auto-increment')
,	Schema = mongoose.Schema;

var connection = mongoose.createConnection("mongodb://localhost:27017/loginapp");
//var connection = mongoose.createConnection("mongodb://172.17.0.2:27017/loginapp");

autoIncrement.initialize(connection);

const certificadoSchema = new Schema({
	token: {type: Schema.Types.ObjectId, ref: 'Certificado'},
	tipo: {type: String}
});

const IntegranteSchema = new Schema({
	tipo: {type: String},
	nome: {type: String},
	email: {type: String},
	cpf: {type: String},
	telefone: {type: String},
	tamCamiseta: {type: String},
	presenca: {type: Boolean},
	certificados: [certificadoSchema]
});

const uploadSchema = new Schema({
	name: {type: String},
	size: {type: Number},
	uploadAt: {type: Date}
});

const ProjetoSchema = new Schema({
	numInscricao: {type: Schema.Types.ObjectId, ref: 'Projeto'},
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
	relatorio: uploadSchema,
	relatorio2: uploadSchema,

	resumo: {type: String},
	palavraChave: {type: String},
	avaliacao: {type: Array}

}, { collection: 'projetos2017' });

ProjetoSchema.methods.hasExpired = function(){
    let now = new Date().now;
    return (now - ProjetoSchema.resetPasswordCreatedDate) > 1;
};

ProjetoSchema.plugin(autoIncrement.plugin, {model: 'Projeto', field: 'numInscricao'});

const Projeto = module.exports = mongoose.model('Projeto', ProjetoSchema);
