'use strict';

const bcrypt = require('bcryptjs')
,	Participante = require('../models/participante-schema');

// LOGIN DO PARTICIPANTE (dashboard próprio) - mesmo padrão de controllers/avaliador-controller.js

// Busca por e-mail (participante não tem "username" - login é sempre pelo e-mail cadastrado).
module.exports.getLoginParticipante = (email, user) => {
	Participante.findOne({ email: email }, user);
};

// Se o participante já definiu senha própria, compara normalmente (bcrypt). Se ainda não
// (senhaDefinida falsy), aceita como "senha" o próprio documento de identificação (campo
// cpf, só dígitos) - primeiro acesso.
module.exports.compareLoginOuBootstrap = (candidatePassword, participante, callback) => {
	if (participante.senhaDefinida && participante.password) {
		bcrypt.compare(candidatePassword, participante.password, (err, isMatch) => {
			if (err) { console.error('Erro ao realizar login de participante', err); return callback(err); }
			callback(null, isMatch);
		});
		return;
	}
	let documento = (participante.cpf || '').replace(/\D+/g, '');
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
