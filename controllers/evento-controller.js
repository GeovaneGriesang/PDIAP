'use strict';

module.exports.createEvento = async (newEvento) => {
	try {
		await newEvento.save();
	} catch (err) {
		console.error('Erro ao salvar Schema preenchido na base do mongo', err);
	}
};