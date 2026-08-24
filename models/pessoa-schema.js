'use strict';

const mongoose = require('mongoose')
,	Schema = mongoose.Schema;

// Pessoa é a identidade central do sistema (frente "login único" - ver memória
// project-frente7-login-unico): dona exclusiva do login (email/senha) e dos dados
// de identidade (documento, nome, telefone, nacionalidade). Avaliador/Participante
// deixam de ter senha própria e passam a só referenciar uma Pessoa (campo `pessoa`).
// Isso permite que a mesma pessoa acumule vários papéis sem duplicar cadastro/senha:
// ao se cadastrar num segundo papel com o mesmo documento, reaproveita a Pessoa e o
// login já existentes (ver controllers/pessoa-controller.js#findOrCreatePessoa).
const PessoaSchema = new Schema({
	// Só dígitos, sem formatação - único em todo o sistema (é a chave que identifica
	// a mesma pessoa entre papéis diferentes).
	documento: { type: String, unique: true, required: true },
	nome: { type: String },
	email: { type: String },
	telefone: { type: String },
	// 'brasileiro' | 'paraguaio' | 'uruguaio' | 'venezuelano'
	nacionalidade: { type: String },

	// Login do dashboard próprio - mesmo padrão já usado em avaliador-schema.js/
	// participante-schema.js: primeiro acesso aceita o próprio documento como senha
	// (ver utils/loginBootstrap.js#compareLoginOuBootstrap), depois obriga trocar por
	// uma senha de verdade antes de liberar o resto do dashboard.
	password: { type: String },
	senhaDefinida: { type: Boolean, default: false },
	resetPasswordToken: { type: String },
	resetPasswordCreatedDate: { type: Date }, // guarda a expiração, não a criação

	token: { type: String },
	createdAt: { type: Date }
}, { collection: 'pessoas' });

PessoaSchema.methods.hasExpired = function(){
	return Date.now() > this.resetPasswordCreatedDate;
};

PessoaSchema.pre('save', function(next) {
	if (!this.token || this.token === "" || this.token === undefined) {
		this.token = new mongoose.Types.ObjectId().valueOf();
	}
	if (!this.createdAt) {
		this.createdAt = Date.now();
	}
	next();
});

const Pessoa = module.exports = mongoose.model('Pessoa', PessoaSchema);
