'use strict';

const mongoose = require('mongoose')
,	Avaliador = require('../models/avaliador-schema');

module.exports.createAvaliador = (newAvaliador, callback) => {
	newAvaliador.save((err, data) => {
		if(err) throw err;
		console.log(data);
	});
};