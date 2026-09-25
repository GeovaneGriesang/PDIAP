'use strict';

const Avaliador = require('../models/avaliador-schema')
,	documentoValidator = require('../utils/documentoValidator')
,	loginBootstrap = require('../utils/loginBootstrap');

module.exports.createAvaliador = async (newAvaliador) => {
	try {
		await newAvaliador.save();
	} catch (err) {
		console.error('Erro ao criar o avaliador', err);
	}
};

// Valida o documento de um avaliador contra QUALQUER nacionalidade suportada (não
// só a selecionada no form - ver utils/documentoValidator.js).
module.exports.validarDocumento = documentoValidator.validarDocumento;
module.exports.validarTelefone = documentoValidator.validarTelefone;

// LOGIN DO AVALIADOR (dashboard próprio)

// Busca por e-mail (avaliador não tem "username" - login é sempre pelo e-mail cadastrado).
// "user" aqui é o callback de quem chama (ex: routes/index.js), no formato (err, doc) -
// mesmo contrato de antes, só que agora resolvido via Promise (Model.findOne com callback
// direto deixa de funcionar nas versões novas do Mongoose - ver Nível 3, parte C).
module.exports.getLoginAvaliador = (email, user) => {
	Avaliador.findOne({ email: email }).then(
		(avaliador) => user(null, avaliador),
		(err) => user(err)
	);
};

// Compara a senha digitada contra quem guarda a senha deste avaliador (a Pessoa vinculada
// ou, sem vínculo, o próprio registro - ver utils/loginBootstrap.js). Quem chama decide,
// com base em senhaDefinida da mesma credencial, se deve obrigar a troca de senha.
module.exports.compareLoginOuBootstrap = async (candidatePassword, avaliador, callback) => {
	let credencial;
	try {
		credencial = await loginBootstrap.carregarCredencial(avaliador);
	} catch (err) {
		console.error('Erro ao realizar login de avaliador', err);
		return callback(err);
	}
	loginBootstrap.compareLoginOuBootstrap(candidatePassword, credencial, callback);
};

// Formata a lista de combinações categoria+eixo de um avaliador pro texto de certificado/
// e-mail (ex: "CATEGORIA A - EIXO X; CATEGORIA B - EIXO Y"). Usada tanto pro que o avaliador
// se inscreveu (categoriasEixos) quanto pro que foi efetivamente avaliado (categoriasEixosAvaliados).
module.exports.formatarCategoriasEixos = (lista) => {
	return (lista || []).map((ce) => ce.categoria + ' - ' + ce.eixo).join('; ');
};

module.exports.senhaForte = loginBootstrap.senhaForte;
