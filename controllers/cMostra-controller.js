'use strict'

//exporta a função createMostra que serve para salvar a Schema preenchida na base do mongo
module.exports.createMostra = async (novaMostra) => {
	try {
		await novaMostra.save();
	} catch (err) {
		console.error('Erro ao salvar Schema preenchida na base do mongo', err);
	}
};