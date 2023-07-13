'use strict';

const mongoose = require('mongoose')
,	Avaliador = require('../models/avaliador-schema');

module.exports.createAvaliador = (newAvaliador, callback) => {
	try {
		console.log('Chegou aqui');
		newAvaliador.save((err, data) => {
			if(err) throw new Error('Erro ao criar o avaliador'); // Alteração Lucas Ferreira
			console.log(data);
		});
	} catch (error) {
		console.log('findOne error--> ${error}'); // Alteração Lucas Ferreira
	}
};
