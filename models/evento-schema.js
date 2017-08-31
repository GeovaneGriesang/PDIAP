'use strict';

const mongoose = require('mongoose')
,	Schema = mongoose.Schema;

const certificadoSchema = new Schema({
	token: {type: Schema.Types.ObjectId, ref: 'Certificado'},
	tipo: {type: String}
});

const responsavelSchema = new Schema({
	 nome: {type: String}
	,cpf: {type: String}
	, certificados: [certificadoSchema]
});

const EventoSchema = new Schema({
	 tipo: {type: String}
	,titulo: {type: String}
	,cargaHoraria: {type: String}
	,responsavel: [responsavelSchema]
	,data: {type: String}
}, { collection: 'eventoCollection' });

const Evento = module.exports = mongoose.model('Evento', EventoSchema);
