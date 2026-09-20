//Leandro Henrique Kopp Ferreira - 14/10/2021
'use strict'

//exporta a função createDocumento que serve para salvar a Schema preenchida na base do mongo
module.exports.createDocumento = async (novoDocumento) => {
	try {
		await novoDocumento.save();
	} catch (err) {
		console.error('Erro ao salvar Schema preenchido na base do mongo', err);
	}
};