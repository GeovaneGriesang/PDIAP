'use strict';

// Quem está logado, num lugar só. Desde o "painel único" (ver memória
// project-frente-perfis-painel-unico) a sessão de qualquer pessoa é a própria Pessoa
// (req.user = Pessoa) - estudante, orientador(a), avaliador(a), participante... O papel
// (Avaliador/Participante) é procurado a partir dela quando uma rota precisa dele.
//
// Exceção: conta legada de Avaliador/Participante SEM Pessoa (ex: cadastrado sem documento)
// continua logando como o próprio papel (req.user = Avaliador/Participante), como antes.
// Os logins próprios do Projeto e da conta admin2 acabaram (só Pessoa e conta legada de papel).

const Pessoa = require('../models/pessoa-schema')
,	Avaliador = require('../models/avaliador-schema')
,	Participante = require('../models/participante-schema');

function modelo(user) {
	return user && user.constructor && user.constructor.modelName;
}
module.exports.modelo = modelo;

module.exports.ehPessoa = (user) => modelo(user) === 'Pessoa';

// Login "de pessoa" (painel): Pessoa ou conta legada de Avaliador/Participante.
module.exports.ehLoginDePessoa = (req) => {
	let m = modelo(req.user);
	return m === 'Pessoa' || m === 'Avaliador' || m === 'Participante';
};

// _id da Pessoa da sessão (ou do vínculo da conta legada), ou null.
module.exports.pessoaId = (req) => {
	if (!req.user) return null;
	if (modelo(req.user) === 'Pessoa') return req.user._id;
	return req.user.pessoa ? (req.user.pessoa._id || req.user.pessoa) : null;
};

// Pessoa da sessão (documento do Mongoose), ou null.
module.exports.pessoaDaSessao = async (req) => {
	if (modelo(req.user) === 'Pessoa') return req.user;
	let id = module.exports.pessoaId(req);
	return id ? Pessoa.findById(id) : null;
};

// Registro de papel mais recente da pessoa logada (mesma regra que o login usava pra
// escolher qual registro entrar: quem se inscreveu de novo numa Mostra seguinte usa o atual).
async function papelDaSessao(req, Papel) {
	if (modelo(req.user) === Papel.modelName) return req.user;
	if (modelo(req.user) !== 'Pessoa') return null;
	return Papel.findOne({ pessoa: req.user._id }).sort({ createdAt: -1 });
}
module.exports.avaliadorDaSessao = (req) => papelDaSessao(req, Avaliador);
module.exports.participanteDaSessao = (req) => papelDaSessao(req, Participante);

// Quem guarda a senha da sessão: a Pessoa, ou (conta legada sem Pessoa) o próprio papel.
module.exports.credencialDaSessao = async (req) => {
	return (await module.exports.pessoaDaSessao(req)) || req.user;
};
