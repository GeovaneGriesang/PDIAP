'use strict';

const mongoose = require('mongoose')
,	bcrypt = require('bcryptjs')
,	autoIncrement = require('mongoose-auto-increment')
,	Schema = mongoose.Schema;
	mongoose.plugin(schema => { schema.options.usePushEach = true });

// Antes abria uma segunda conexão própria com o banco só pra isso (mongoose.createConnection),
// além da conexão principal já aberta por configs/db-config.js. Reaproveita a conexão padrão
// do Mongoose (que app.js garante estar aberta antes de qualquer model ser carregado).
autoIncrement.initialize(mongoose.connection);

const certificadoSchema = new Schema({
	_id: {type: Schema.Types.ObjectId, ref: 'Certificado'},
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
	certificados: certificadoSchema
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
	avaliacao: {type: Array},
	premiacao: {type: String},
	colocacao: {type: Number},
	mostratec: {type: Boolean},
	feirasClassificadas: [{type: Schema.Types.ObjectId, ref: 'Feira'}],
	token: {type:String}

// }, { collection: 'betaPorcaoAPI' });
// }, { collection: 'projetos2016' });
}, { collection: 'projetos'});

ProjetoSchema.methods.hasExpired = function(){
    // Bug corrigido: "new Date().now" é undefined (Date não tem essa propriedade,
    // só a classe tem o método estático Date.now()) e "ProjetoSchema.resetPasswordCreatedDate"
    // referenciava o Schema em vez do documento (this) — o resultado era sempre NaN > 1,
    // ou seja, sempre false: o token de redefinição de senha nunca expirava.
    // resetPasswordCreatedDate guarda o instante de expiração (createdAt + 1h), não a criação.
    return Date.now() > this.resetPasswordCreatedDate;
};

ProjetoSchema.plugin(autoIncrement.plugin, {model: 'Projeto', field: 'numInscricao'});

const Projeto = module.exports = mongoose.model('Projeto', ProjetoSchema);
