'use strict';

const mongoose = require('mongoose')
,	Schema = mongoose.Schema;

const eventoSchema = new Schema({
	tipo: {type: String},
	titulo: {type: String},
	cargaHoraria: {type: String}
});

const ParticipantelSchema = new Schema({
	// Referencia a identidade central (login único - ver models/pessoa-schema.js e
	// memória project-frente7-login-unico). Enquanto a migração não roda pra um registro
	// antigo, fica undefined. nome/email/cpf abaixo continuam existindo por enquanto como
	// cópia de exibição, mas autenticação passa a ser sempre via Pessoa.
	pessoa: { type: Schema.Types.ObjectId, ref: 'Pessoa' },
	nome: {type: String},
	cpf: {type: String},
	email: {type: String},
	eventos: [eventoSchema],
	tokenSaberes : {type: String},
	tokenOficinas : {type: String},
	createdAt: {type: Date},

	// Login do participante (dashboard próprio) - mesmo padrão do Avaliador
	// (controllers/avaliador-controller.js#compareLoginOuBootstrap): primeiro acesso usa o
	// documento (cpf, só dígitos) como senha, depois obriga trocar por uma senha de verdade.
	password: { type: String },
	senhaDefinida: { type: Boolean, default: false },
	resetPasswordToken: { type: String },
	resetPasswordCreatedDate: { type: Date } // guarda a expiração, não a criação
}, { collection: 'participantes2016' });

ParticipantelSchema.methods.hasExpired = function(){
	return Date.now() > this.resetPasswordCreatedDate;
};

const Participante = module.exports = mongoose.model('Participante', ParticipantelSchema);
