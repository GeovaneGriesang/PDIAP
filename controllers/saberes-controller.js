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
	newSaberes.save((err, data) => {
		if(err) throw err;
		console.log(data);
	});
};