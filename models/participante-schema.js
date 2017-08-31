'use strict';

const mongoose = require('mongoose')
,	Schema = mongoose.Schema;

const eventoSchema = new Schema({
	tipo: {type: String},
	titulo: {type: String},
	cargaHoraria: {type: String}
});

const ParticipantelSchema = new Schema({
	nome: {type: String},
	cpf: {type: String},
	eventos: [eventoSchema],
	tokenSaberes : {type: String},
	tokenOficinas : {type: String}
}, { collection: 'participanteCollection' });

const Participante = module.exports = mongoose.model('Participante', ParticipantelSchema);
