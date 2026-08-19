'use strict';

const mongoose = require('mongoose')
,	Avaliador = require('../models/avaliador-schema');

module.exports.createAvaliador = (newAvaliador, callback) => {
	try {
		newAvaliador.save((err, data) => {
			if (err) { console.error('Erro ao criar o avaliador', err); return; }
		});
	} catch (error) {
		console.log('findOne error--> ${error}'); // Alteração Lucas Ferreira
	}
};

function _validateCPF(cpf) {
	cpf = (cpf || '').replace(/\D+/g, '');
	if (cpf.length !== 11 || /^([0-9])\1+$/.test(cpf)) return false;
	var sum = 0, rest;
	for (var i = 1; i <= 9; i++) sum += parseInt(cpf.substring(i-1, i)) * (11 - i);
	rest = (sum * 10) % 11; if (rest === 10 || rest === 11) rest = 0;
	if (rest !== parseInt(cpf.substring(9, 10))) return false;
	sum = 0;
	for (i = 1; i <= 10; i++) sum += parseInt(cpf.substring(i-1, i)) * (12 - i);
	rest = (sum * 10) % 11; if (rest === 10 || rest === 11) rest = 0;
	if (rest !== parseInt(cpf.substring(10, 11))) return false;
	return true;
}

// Valida o par nacionalidade + documento de um avaliador: CPF (com dígito verificador)
// para brasileiro, ou um mínimo de 5 dígitos para uruguaio (cédula).
module.exports.validarDocumento = (nacionalidade, documento) => {
	var digits = (documento || '').toString().replace(/\D+/g, '');
	if (nacionalidade !== 'brasileiro' && nacionalidade !== 'uruguaio') {
		return { valido: false, mensagem: 'Selecione a nacionalidade (Brasileiro ou Uruguaio).' };
	}
	if (nacionalidade === 'brasileiro') {
		return _validateCPF(digits) ? { valido: true } : { valido: false, mensagem: 'CPF inválido.' };
	}
	return digits.length >= 5 ? { valido: true } : { valido: false, mensagem: 'Documento de identificação inválido.' };
};
