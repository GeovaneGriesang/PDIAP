'use strict';

const mongoose = require('mongoose')

module.exports.createSaberes = (newSaberes, callback) => {
	newSaberes.save((callback) => {
		//if (err) { console.error(err); return; }
		//res.status(200).send("success");
		//return data;
		//console.log(data);
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