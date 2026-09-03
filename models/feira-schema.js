'use strict';

const mongoose = require('mongoose')
,	Schema = mongoose.Schema;

// Feira externa (ex: Mostratec, Mostratec Júnior, MOCITEC) para a qual um projeto pode ser
// classificado. Cadastrada por ano/mostra, com as categorias às quais se aplica e o texto
// do certificado de classificação - ver models/projeto-schema.js (feirasClassificadas).
//
// Também serve, com tipo:'edicao', pra representar a própria edição anual do MOVACI/PDIAP
// (categoriasEixos/diasAvaliacao) - não existia nenhuma outra coleção com histórico por ano
// pra isso, então reaproveita esta em vez de criar uma nova (decisão de produto, não só
// técnica). categorias/textoCertificado só fazem sentido pra tipo:'classificacao'.
const FeiraSchema = new Schema({
	nome: {type: String},
	categorias: [{type: String}],
	textoCertificado: {type: String},
	ano: {type: Number},
	createdAt: {type: Date},
	tipo: {type: String, enum: ['classificacao', 'edicao'], default: 'classificacao'},
	categoriasEixos: [{
		categoria: {type: String},
		eixos: [{type: String}]
	}],
	diasAvaliacao: [{
		data: {type: String},
		turnos: [{type: String}]
	}]
}, { collection: 'feiras' });

const Feira = module.exports = mongoose.model('Feira', FeiraSchema);
