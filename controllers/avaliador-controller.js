'use strict';

const mongoose = require('mongoose')
,	bcrypt = require('bcryptjs')
,	Avaliador = require('../models/avaliador-schema')
,	documentoValidator = require('../utils/documentoValidator');

module.exports.createAvaliador = (newAvaliador, callback) => {
	try {
		newAvaliador.save((err, data) => {
			if (err) { console.error('Erro ao criar o avaliador', err); return; }
		});
	} catch (error) {
		console.log('findOne error--> ${error}'); // Alteração Lucas Ferreira
	}
};

// Valida o documento de um avaliador contra QUALQUER nacionalidade suportada (não
// só a selecionada no form - ver utils/documentoValidator.js).
module.exports.validarDocumento = documentoValidator.validarDocumento;
module.exports.validarTelefone = documentoValidator.validarTelefone;

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

// Formata a lista de combinações categoria+eixo de um avaliador pro texto de certificado/
// e-mail (ex: "CATEGORIA A - EIXO X; CATEGORIA B - EIXO Y"). Usada tanto pro que o avaliador
// se inscreveu (categoriasEixos) quanto pro que foi efetivamente avaliado (categoriasEixosAvaliados).
module.exports.formatarCategoriasEixos = (lista) => {
	return (lista || []).map((ce) => ce.categoria + ' - ' + ce.eixo).join('; ');
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
