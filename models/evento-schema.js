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
	,createdAt: {type: Date}
	// Mostra (Feira tipo:'edicao') a que o evento pertence. Eventos antigos não têm - nesse caso
	// a tela cai no ano de createdAt (ver adminAPI.pertenceAMostra).
	,feiraId: {type: Schema.Types.ObjectId, ref: 'Feira'}
	// Qual Seminario este Evento pertence - só usado quando tipo === 'Seminário' (ver
	// models/seminario-schema.js). Semana Acadêmica/Oficina/Palestra nunca preenchem isso.
	,seminarioId: {type: Schema.Types.ObjectId, ref: 'Seminario'}
}, { collection: 'eventos2016' });//Os documentos não possuem token

const Evento = module.exports = mongoose.model('Evento', EventoSchema);
