'use strict';

const bcrypt = require('bcryptjs')
,	Pessoa = require('../models/pessoa-schema')
,	Avaliador = require('../models/avaliador-schema')
,	Participante = require('../models/participante-schema')
,	pessoaController = require('../controllers/pessoa-controller');

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
	// Letras contam (documento de estrangeiro pode ser alfanumérico, ex: passaporte); só
	// pontuação/espaço é ignorada, e maiúscula/minúscula tanto faz.
	let documento = (credencial.documento || credencial.cpf || '').replace(/[^0-9A-Za-z]/g, '').toUpperCase();
	let tentativa = (candidatePassword || '').replace(/[^0-9A-Za-z]/g, '').toUpperCase();
	callback(null, documento.length > 0 && documento === tentativa);
};

function compararAsync(password, credencial) {
	return new Promise((resolve, reject) => {
		module.exports.compareLoginOuBootstrap(password, credencial, (err, ok) => err ? reject(err) : resolve(ok));
	});
}

// Login de qualquer pessoa (painel único): a sessão é a própria Pessoa, achada por qualquer
// um dos e-mails dela (principal ou alternativo) - não precisa ter papel de Avaliador/
// Participante (estudante e orientador(a) também entram). Se houver mais de uma Pessoa com o
// mesmo e-mail (cadastros duplicados antigos), entra na que a senha bater.
// Sem Pessoa com esse e-mail, cai no jeito antigo (autenticarPapelLegado).
// Callback: (err, usuarioDaSessao | false).
module.exports.autenticarLogin = async (email, password, callback) => {
	try {
		let pessoas = await pessoaController.buscarPorEmail(email);
		if (!pessoas.length) return module.exports.autenticarPapelLegado(email, password, callback);
		for (let pessoa of pessoas) {
			if (await compararAsync(password, pessoa)) return callback(null, pessoa);
		}
		callback(null, false);
	} catch (err) {
		callback(err);
	}
};

// Comportamento de antes do login por Pessoa: Avaliador por e-mail, senão Participante por
// e-mail - compara com quem guarda a senha (a Pessoa vinculada, se houver, senão o próprio
// registro; ver carregarCredencial). Papel com Pessoa vinculada (e-mail do papel diferente do
// da Pessoa) entra como a Pessoa; sem vínculo, como o próprio papel (conta legada).
module.exports.autenticarPapelLegado = async (email, password, callback) => {
	try {
		let re = pessoaController.regexEmailExato(email);
		let papel = await Avaliador.findOne({ email: re }) || await Participante.findOne({ email: re });
		if (!papel) return callback(null, false);

		let credencial = await module.exports.carregarCredencial(papel);
		if (!(await compararAsync(password, credencial))) return callback(null, false);
		callback(null, credencial.constructor.modelName === 'Pessoa' ? credencial : papel);
	} catch (err) {
		callback(err);
	}
};

// Recuperação de senha unificada (ver routes/index.js#/conta/nova-senha): o token pode
// ter sido gravado na Pessoa (fluxo novo) ou, pra conta legada sem vínculo, direto no
// Avaliador/Participante.
module.exports.encontrarPorTokenResetUnico = async (token) => {
	return (await Pessoa.findOne({ resetPasswordToken: token }))
		|| (await Avaliador.findOne({ resetPasswordToken: token }))
		|| (await Participante.findOne({ resetPasswordToken: token }));
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
