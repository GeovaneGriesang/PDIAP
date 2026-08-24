'use strict';

const bcrypt = require('bcryptjs');

// Extraído de controllers/avaliador-controller.js e controllers/participante-controller.js
// (eram cópias byte-a-byte) - agora opera só sobre Pessoa (ver models/pessoa-schema.js).
//
// Se a pessoa já definiu senha própria, compara normalmente (bcrypt). Se ainda não
// (senhaDefinida falsy - inclui registros migrados de Avaliador/Participante que nunca
// tiveram esse campo), aceita como "senha" o próprio documento de identificação (só
// dígitos) - primeiro acesso. Quem chama essa função decide, com base em
// pessoa.senhaDefinida, se deve obrigar a troca de senha em seguida.
module.exports.compareLoginOuBootstrap = (candidatePassword, pessoa, callback) => {
	if (pessoa.senhaDefinida && pessoa.password) {
		bcrypt.compare(candidatePassword, pessoa.password, (err, isMatch) => {
			if (err) { console.error('Erro ao realizar login', err); return callback(err); }
			callback(null, isMatch);
		});
		return;
	}
	let documento = (pessoa.documento || '').replace(/\D+/g, '');
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
