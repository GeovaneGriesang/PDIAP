'use strict';

const mongoose = require('mongoose')
,	bcrypt = require('bcryptjs')
,	Schema = mongoose.Schema;

// Substitui o pacote mongoose-auto-increment (abandonado, preso à API de callback do
// Mongoose 4 - parte da migração do Nível 3/Mongoose, ver memória
// project-dependencias-desatualizadas). Reaproveita a MESMA collection/documento contador
// que o pacote antigo já usava ({model:'Projeto', field:'numInscricao', count:N} em
// identitycounters), pra não resetar a numeração de projetos já existente.
const IdentityCounterSchema = new Schema({
	model: {type: String},
	field: {type: String},
	count: {type: Number, default: 0}
}, { collection: 'identitycounters' });
const IdentityCounter = mongoose.model('IdentityCounter', IdentityCounterSchema);

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
	// Número sequencial de inscrição - sempre foi um Number puro gravado direto no banco
	// (o "ref: Projeto" antigo aqui era um erro de cópia, nunca guardou ObjectId de verdade).
	// Atribuído em ProjetoSchema.pre('save') abaixo, só pra documentos novos.
	numInscricao: {type: Number},
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


	username: {type: String, required: true, unique: true},
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
	// A qual Mostra/edição (Feira tipo:'edicao') este projeto pertence - não confundir com
	// feirasClassificadas acima (feiras EXTERNAS tipo:'classificacao', ex Mostratec). Fica
	// undefined em registros antigos (o "ano" deles continua vindo de createdAt até rodar
	// scripts/migrar-feiraId.js) - permite ter mais de uma Mostra no mesmo ano com listas de
	// projetos separadas de verdade, ver memória project-mostra-ano-nao-unico.
	feiraId: {type: Schema.Types.ObjectId, ref: 'Feira'},
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

// Gera numInscricao pra projetos novos - incremento atômico via $inc (mesma garantia contra
// duplicidade em criações concorrentes que o mongoose-auto-increment já dava), reaproveitando
// o documento contador existente em identitycounters (ver IdentityCounterSchema acima).
// Sem parâmetro next: o mongoose 9 deixa de passar next() pro middleware pre (já pronto pra ele) -
// o async já sinaliza fim (resolve) ou erro (rejeita, abortando o save).
ProjetoSchema.pre('save', async function() {
	if (!this.isNew) return;
	let counter = await IdentityCounter.findOneAndUpdate(
		{ model: 'Projeto', field: 'numInscricao' },
		{ $inc: { count: 1 } },
		{ returnDocument: 'after', upsert: true }
	);
	this.numInscricao = counter.count;
});

const Projeto = module.exports = mongoose.model('Projeto', ProjetoSchema);
