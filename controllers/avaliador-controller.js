'use strict';

const mongoose = require('mongoose')
,	Avaliador = require('../models/avaliador-schema');

module.exports.createAvaliador = (newAvaliador, callback) => {
	try {
		newAvaliador.save((err, data) => {
			if (err) { console.error('Erro ao criar o avaliador', err); return; }
		});
	} catch (error) {
		console.log('findOne error--> ${error}'); // Alteração Lucas Ferreira
	}
};
