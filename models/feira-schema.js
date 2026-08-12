'use strict';

const mongoose = require('mongoose')
,	Schema = mongoose.Schema;

// Feira externa (ex: Mostratec, Mostratec Júnior, MOCITEC) para a qual um projeto pode ser
// classificado. Cadastrada por ano/mostra, com as categorias às quais se aplica e o texto
// do certificado de classificação - ver models/projeto-schema.js (feirasClassificadas).
const FeiraSchema = new Schema({
	nome: {type: String},
	categorias: [{type: String}],
	textoCertificado: {type: String},
	ano: {type: Number},
	createdAt: {type: Date}
}, { collection: 'feiras' });

const Feira = module.exports = mongoose.model('Feira', FeiraSchema);
