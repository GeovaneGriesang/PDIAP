'use strict';

const Participante = require('../models/participante-schema')
,	loginBootstrap = require('../utils/loginBootstrap');

// LOGIN DO PARTICIPANTE (dashboard próprio) - mesmo padrão de controllers/avaliador-controller.js

// Busca por e-mail (participante não tem "username" - login é sempre pelo e-mail cadastrado).
// "user" aqui é o callback de quem chama (ex: routes/index.js), no formato (err, doc) -
// mesmo contrato de antes, só que agora resolvido via Promise (Model.findOne com callback
// direto deixa de funcionar nas versões novas do Mongoose - ver Nível 3, parte C).
module.exports.getLoginParticipante = (email, user) => {
	Participante.findOne({ email: email }).then(
		(participante) => user(null, participante),
		(err) => user(err)
	);
};

// Compara a senha digitada contra quem guarda a senha deste participante (a Pessoa
// vinculada ou, sem vínculo, o próprio registro - ver utils/loginBootstrap.js).
module.exports.compareLoginOuBootstrap = async (candidatePassword, participante, callback) => {
	let credencial;
	try {
		credencial = await loginBootstrap.carregarCredencial(participante);
	} catch (err) {
		console.error('Erro ao realizar login de participante', err);
		return callback(err);
	}
	loginBootstrap.compareLoginOuBootstrap(candidatePassword, credencial, callback);
};

module.exports.senhaForte = loginBootstrap.senhaForte;
