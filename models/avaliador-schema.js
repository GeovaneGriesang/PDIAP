// Geovane Griesang - 07/04/2026 :: Adicionada automação para geração de token e limpeza de undefined
'use strict';

const mongoose = require('mongoose')
,	Schema = mongoose.Schema;

const AvaliadorSchema = new Schema({
	nome: { type: String },
	email: { type: String },
	// 'brasileiro' | 'uruguaio'. Sem 'required' aqui porque as rotas montam o objeto
	// campo a campo a partir de req.body — a obrigatoriedade real (nacionalidade + cpf)
	// é validada em controllers/avaliador-controller.js#validarDocumento.
	nacionalidade: { type: String },
	cpf: { type: String },
	rg: { type: String },
	dtNascimento: { type: String },
	nivelAcademico: { type: String },
	categoria: { type: String },
	eixo: { type: String },
	atuacaoProfissional: { type: String },
	tempoAtuacao: { type: String },
	telefone: { type: String },
	curriculo: { type: String },
	turnos: { type: Array },
	avaliacao: { type: Boolean },
	token: { type: String }, // Adicionado
	createdAt:{ type: Date },

	// Login do avaliador (dashboard próprio) - avaliador não tem senha própria até o
	// primeiro acesso: nesse momento a "senha" aceita é o próprio documento (campo cpf,
	// só dígitos - ver controllers/avaliador-controller.js#compareLoginOuBootstrap), e o
	// login obriga trocar pra uma senha de verdade antes de liberar o resto do dashboard.
	// Registros antigos ficam com senhaDefinida undefined (tratado como false), então
	// funcionam com o primeiro acesso sem precisar de migração.
	password: { type: String },
	senhaDefinida: { type: Boolean, default: false },
	resetPasswordToken: { type: String },
	resetPasswordCreatedDate: { type: Date } // guarda a expiração, não a criação (mesmo padrão de projeto-schema.js)
}, { collection: 'avaliadores' });

AvaliadorSchema.methods.hasExpired = function(){
	return Date.now() > this.resetPasswordCreatedDate;
};

/**
 * Geovane Griesang - 07/04/2026
 * Middleware 'pre-save': Garante que todo avaliador possua um token único antes de ser gravado.
 * Isso evita o erro 'undefined' nos certificados e automatiza a manutenção do banco.
 */
AvaliadorSchema.pre('save', function(next) {
  if (!this.token || this.token === "" || this.token === undefined) {
    // Gera um novo identificador único caso não exista
    this.token = new mongoose.Types.ObjectId().valueOf();
  }
  next();
});

const Avaliador = module.exports = mongoose.model('Avaliador', AvaliadorSchema);