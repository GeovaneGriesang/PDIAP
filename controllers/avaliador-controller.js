'use strict';

const mongoose = require('mongoose')
,	bcrypt = require('bcryptjs')
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

// LOGIN DO AVALIADOR (dashboard próprio)

// Busca por e-mail (avaliador não tem "username" - login é sempre pelo e-mail cadastrado).
module.exports.getLoginAvaliador = (email, user) => {
	Avaliador.findOne({ email: email }, user);
};

// Se o avaliador já definiu senha própria, compara normalmente (bcrypt). Se ainda não
// (senhaDefinida falsy - inclui registros antigos, que nunca tiveram esse campo), aceita
// como "senha" o próprio documento de identificação (campo cpf, só dígitos) - primeiro
// acesso. Quem chama essa função decide, com base em avaliador.senhaDefinida, se deve
// obrigar a troca de senha em seguida.
module.exports.compareLoginOuBootstrap = (candidatePassword, avaliador, callback) => {
	if (avaliador.senhaDefinida && avaliador.password) {
		bcrypt.compare(candidatePassword, avaliador.password, (err, isMatch) => {
			if (err) { console.error('Erro ao realizar login de avaliador', err); return callback(err); }
			callback(null, isMatch);
		});
		return;
	}
	let documento = (avaliador.cpf || '').replace(/\D+/g, '');
	let tentativa = (candidatePassword || '').replace(/\D+/g, '');
	callback(null, documento.length > 0 && documento === tentativa);
};

// Senha forte: 8 a 12 caracteres, exigindo maiúscula, minúscula, número e símbolo.
module.exports.senhaForte = (senha) => {
	if (typeof senha !== 'string' || senha.length < 8 || senha.length > 12) return false;
	if (!/[A-Z]/.test(senha)) return false;
	if (!/[a-z]/.test(senha)) return false;
	if (!/[0-9]/.test(senha)) return false;
	if (!/[^A-Za-z0-9]/.test(senha)) return false;
	return true;
};
