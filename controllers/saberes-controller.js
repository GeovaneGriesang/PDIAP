'use strict';

const mongoose = require('mongoose')

module.exports.createSaberes = (newSaberes, callback) => {
	newSaberes.save((callback) => {
		//if(err) throw err;
		//res.status(200).send("success");
		//return data;
		//console.log(data);
	});
};

module.exports.createAtivSaberes = (newSaberes, callback) => {
	try {
		newSaberes.save((err, data) => {
			if(err) throw new Error('Erro ao criar atividade do Saberes Docentes'); // Alteração Lucas Ferreira
			console.log(data);
		});
	} catch (error) {
		console.log('findOne error--> ${error}'); // Alteração Lucas Ferreira
	}
};