'use strict';

const bcrypt = require('bcryptjs')
,	Pessoa = require('../models/pessoa-schema');

// Login único (ver models/pessoa-schema.js): quando um Avaliador/Participante está
// vinculado a uma Pessoa, a senha (e o estado "primeiro acesso"/reset) mora na Pessoa e é
// compartilhada por todos os papéis dela. Papel sem vínculo (ex: cadastrado sem CPF) segue
// usando os campos de senha do próprio registro, como antes.
//
// Devolve o documento que guarda a senha deste papel: a Pessoa vinculada ou, se não há
// vínculo (ou a Pessoa sumiu), o próprio registro.
module.exports.carregarCredencial = async (registro) => {
	if (!registro || !registro.pessoa) return registro;
	let pessoa = await Pessoa.findById(registro.pessoa._id || registro.pessoa);
	return pessoa || registro;
};

// Token de "esqueci a senha": procura primeiro na Pessoa (fluxo novo) e depois no papel
// (tokens emitidos antes do login único, ou papel sem vínculo).
module.exports.encontrarPorTokenReset = async (Papel, token) => {
	return (await Pessoa.findOne({ resetPasswordToken: token })) || (await Papel.findOne({ resetPasswordToken: token }));
};

// Se quem guarda a senha (Pessoa ou registro legado) já definiu senha própria, compara
// normalmente (bcrypt). Se ainda não (senhaDefinida falsy - inclui registros antigos, que
// nunca tiveram esse campo), aceita como "senha" o próprio documento de identificação (só
// dígitos; `documento` na Pessoa, `cpf` no registro legado) - primeiro acesso. Quem chama
// decide, com base em senhaDefinida, se deve obrigar a troca de senha em seguida.
module.exports.compareLoginOuBootstrap = (candidatePassword, credencial, callback) => {
	if (credencial.senhaDefinida && credencial.password) {
		bcrypt.compare(candidatePassword, credencial.password, (err, isMatch) => {
			if (err) { console.error('Erro ao realizar login', err); return callback(err); }
			callback(null, isMatch);
		});
		return;
	}
	let documento = (credencial.documento || credencial.cpf || '').replace(/\D+/g, '');
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
