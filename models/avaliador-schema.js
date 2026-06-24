// Geovane Griesang - 07/04/2026 :: Adicionada automação para geração de token e limpeza de undefined
'use strict';

const mongoose = require('mongoose')
,	Schema = mongoose.Schema;

const AvaliadorSchema = new Schema({
	nome: { type: String },
	email: { type: String },
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
	createdAt:{ type: Date }
}, { collection: 'avaliadores' });

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