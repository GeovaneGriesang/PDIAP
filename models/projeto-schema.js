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
	nacionalidade: {type: String},
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

	// nomeEscola continua sendo gravado (cópia denormalizada) mesmo depois do cadastro
	// formal de escolas - dezenas de telas/relatórios/testes já leem esse campo direto;
	// toda gravação de "escola" deve manter os dois em sincronia.
	nomeEscola: {type: String},
	escola: {type: Schema.Types.ObjectId, ref: 'Escola'},
	cep: {type: String},
	cidade: {type: String},
	estado: {type: String},


	username: {type: String, required: true, unique: true, uniqueCaseInsensitive:true},
	email: {type: String, required: true},
	password: {type: String, required: true},
	permissao: {type: String},
	aprovado: {type: Boolean},
	// Qual dos dois tipos de aprovação o projeto recebeu. Só faz sentido quando
	// aprovado === true; 'anais' = "Aprovado para apresentação e publicação nos anais",
	// 'apresentacao' = "Aprovado somente para apresentação no evento". Fica ao LADO de
	// 'aprovado' (que continua true pros dois tipos) de propósito: os ~16 lugares que já
	// leem aprovado === true continuam valendo sem precisar de mudança.
	tipoAprovacao: {type: String, enum: ['anais', 'apresentacao']},
	// "Resumo Simples" | "Resumo Expandido" | "Artigo" - importado da lista oficial de
	// trabalhos aprovados (vem do sistema de submissão dos textos, não é perguntado na
	// inscrição).
	modalidade: {type: String},
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
