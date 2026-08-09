'use strict';

const mongoose = require('mongoose')

module.exports.createSaberes = (newSaberes, callback) => {
	newSaberes.save((err) => {
		if (err) { console.error('Erro ao criar registro de Saberes Docentes', err); return; }
	});
};

module.exports.createAtivSaberes = (newSaberes, callback) => {
	try {
		newSaberes.save((err, data) => {
			if (err) { console.error('Erro ao criar atividade do Saberes Docentes', err); return; }
		});
	} catch (error) {
		console.log('findOne error--> ${error}'); // Alteração Lucas Ferreira
	}
};