'use strict';

const mongoose = require('mongoose')
,	Evento = require('../models/evento-schema');

module.exports.createEvento = (newEvento, callback) => {
	try {
		newEvento.save((err, data) => {
			if(err) throw new Error('Erro ao salvar salvar Schema preenchido na base do mongo'); // Alteração Lucas Ferreira
			console.log(data);
		});
	} catch (error) {
		console.log('findOne error--> ${error}'); // Alteração Lucas Ferreira
	}
};