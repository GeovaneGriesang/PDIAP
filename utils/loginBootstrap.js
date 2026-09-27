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
	let documento = (credencial.documento || credencial.cpf || '').replace(/\D+/g, '');
	let tentativa = (candidatePassword || '').replace(/\D+/g, '');
	callback(null, documento.length > 0 && documento === tentativa);
};

// Login único de verdade: quem loga por e-mail de Avaliador/Participante é sempre a
// mesma Pessoa, então a autenticação tenta a Pessoa primeiro (uma senha só, pros dois
// papéis) e só cai no jeito antigo (Avaliador por e-mail, depois Participante por
// e-mail) se não achar Pessoa nenhuma com esse e-mail - conta legada sem vínculo, ou
// algum e-mail que ficou divergente entre a Pessoa e o papel.
module.exports.autenticarPapel = (email, password, callback) => {
	pessoaController.getLoginPessoa(email, (err, pessoa) => {
		if (err) return callback(err);
		if (!pessoa) return module.exports.autenticarPapelLegado(email, password, callback);

		module.exports.compareLoginOuBootstrap(password, pessoa, async (err, isMatch) => {
			if (err) return callback(err);
			if (!isMatch) return callback(null, false);

			try {
				// Mais recente primeiro - quem se inscreveu de novo numa Mostra seguinte usa o
				// registro mais atual; prioridade Avaliador > Participante, mesma ordem que a
				// cascata de login já respeitava.
				let [avaliador, participante] = await Promise.all([
					Avaliador.findOne({ pessoa: pessoa._id }).sort({ createdAt: -1 }),
					Participante.findOne({ pessoa: pessoa._id }).sort({ createdAt: -1 })
				]);
				callback(null, avaliador || participante || false);
			} catch (err) {
				callback(err);
			}
		});
	});
};

// Comportamento de antes do login único por Pessoa: Avaliador por e-mail, senão
// Participante por e-mail - cada um resolve pra quem guarda a senha (a Pessoa vinculada,
// se houver, senão o próprio registro; ver carregarCredencial) antes de comparar, mesma
// regra que controllers/avaliador-controller.js#compareLoginOuBootstrap e o irmão do
// participante já aplicavam.
module.exports.autenticarPapelLegado = async (email, password, callback) => {
	try {
		let papel = await Avaliador.findOne({ email: email }) || await Participante.findOne({ email: email });
		if (!papel) return callback(null, false);

		let credencial = await module.exports.carregarCredencial(papel);
		module.exports.compareLoginOuBootstrap(password, credencial, (err, isMatch) => {
			if (err) return callback(err);
			callback(null, isMatch ? papel : false);
		});
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
