'use strict';

module.exports.createSaberes = async (newSaberes) => {
	try {
		await newSaberes.save();
	} catch (err) {
		console.error('Erro ao criar registro de Saberes Docentes', err);
	}
};
