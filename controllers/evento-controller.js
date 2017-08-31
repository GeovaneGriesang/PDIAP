'use strict';

const mongoose = require('mongoose')
,	Evento = require('../models/evento-schema');

module.exports.createEvento = (newEvento, callback) => {
	newEvento.save((err, data) => {
		if(err) throw err;
		console.log(data);
	});
};