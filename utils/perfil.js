'use strict';

// Perfis de acesso ao admin (ver memória project-frente-perfis-painel-unico):
//  - Padrão: toda pessoa (painel próprio, sem acesso ao admin);
//  - Administrador(a) DE MOSTRA: Pessoa listada em Feira.administradores (tipo:'edicao') - o acesso
//    do admin, mas SÓ às Mostras dela; as outras não aparecem nem podem ser alteradas;
//  - Super-admin: Pessoa com superAdmin:true - tudo, inclusive as configurações globais (criar
//    Mostra e atribuir admins, Tela inicial, Mostra atual, Escolas, Feiras filiadas, Pessoas).
// A conta antiga "admin2" (Admin com permissao "3") conta como super-admin enquanto existir.
//
// O filtro por Mostra é feito no SERVIDOR (escopo/comEscopo/foraDoEscopo): esconder no menu não
// basta, porque as rotas do admin devolviam tudo e o navegador é que filtrava.

const Feira = require('../models/feira-schema')
,	sessao = require('./sessao');

function idValido(id) {
	return (typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id)) || (id && id._bsontype === 'ObjectId');
}

// { superAdmin, ehAdmin, mostras: [{_id, nome, ano}] } da sessão - calculado uma vez por requisição.
async function carregar(req) {
	if (req._perfil) return req._perfil;
	let p = { superAdmin: false, ehAdmin: false, mostras: [], nome: undefined };
	let u = req.isAuthenticated && req.isAuthenticated() ? req.user : null;
	let modelo = sessao.modelo(u);
	if (modelo === 'Admin' && u.permissao === '3') {
		p.superAdmin = true;
		p.nome = u.username;
	} else if (modelo === 'Pessoa') {
		p.nome = u.nome;
		if (u.superAdmin === true) p.superAdmin = true;
		else p.mostras = await Feira.find({ tipo: 'edicao', administradores: u._id }, '_id nome ano').sort({ ano: -1 }).lean();
	}
	p.ehAdmin = p.superAdmin || p.mostras.length > 0;
	req._perfil = p;
	return p;
}
module.exports.carregar = carregar;

// Middlewares.
module.exports.exigeAdmin = async (req, res, next) => {
	try {
		if ((await carregar(req)).ehAdmin) return next();
		res.sendStatus(403);
	} catch (err) {
		console.error('Erro ao carregar perfil', err);
		res.sendStatus(500);
	}
};
module.exports.exigeSuperAdmin = async (req, res, next) => {
	try {
		if ((await carregar(req)).superAdmin) return next();
		res.sendStatus(403);
	} catch (err) {
		console.error('Erro ao carregar perfil', err);
		res.sendStatus(500);
	}
};

// A Mostra (id) é deste(a) admin? Super-admin: qualquer edição.
module.exports.podeMostra = async (req, mostraId) => {
	let p = await carregar(req);
	if (!mostraId || !idValido(mostraId)) return false;
	if (p.superAdmin) return !!(await Feira.exists({ _id: mostraId, tipo: 'edicao' }));
	return p.mostras.some((m) => String(m._id) === String(mostraId));
};

// Anos das Mostras deste(a) admin (null = todos) - pra o que é guardado por ano, sem Mostra:
// layout de certificado, documentos, histórico de e-mails, Saberes.
module.exports.anosPermitidos = async (req) => {
	let p = await carregar(req);
	if (p.superAdmin) return null;
	return [...new Set(p.mostras.map((m) => m.ano).filter(Boolean))];
};
module.exports.podeAno = async (req, ano) => {
	let anos = await module.exports.anosPermitidos(req);
	return anos === null || anos.indexOf(parseInt(ano, 10)) !== -1;
};

const intervaloAno = (ano) => ({ $gte: new Date(ano, 0, 1), $lt: new Date(ano + 1, 0, 1) });

// Filtro Mongo "registro de uma das Mostras deste(a) admin" (null = sem restrição): feiraId de uma
// delas ou, em registro antigo sem feiraId, createdAt no ano de uma delas quando ela é a ÚNICA
// edição do ano (mesma regra de perfis-controller/migrar-feiraId). Vale pra Projeto, Avaliador,
// Participante, Evento e Seminário (todos têm feiraId + createdAt).
async function escopo(req) {
	let p = await carregar(req);
	if (p.superAdmin) return null;
	if (req._escopo) return req._escopo;
	let ids = p.mostras.map((m) => m._id);
	let condicoes = [{ feiraId: { $in: ids } }];
	let anos = [];
	for (let m of p.mostras) {
		if (m.ano && (await Feira.countDocuments({ tipo: 'edicao', ano: m.ano })) === 1) anos.push(m.ano);
	}
	if (anos.length) condicoes.push({ feiraId: null, $or: anos.map((a) => ({ createdAt: intervaloAno(a) })) });
	req._escopo = { $or: condicoes };
	return req._escopo;
}
module.exports.escopo = escopo;

// filtro AND escopo (pra find/updateMany/etc.).
module.exports.comEscopo = async (req, filtro) => {
	let e = await escopo(req);
	if (!e) return filtro || {};
	return filtro && Object.keys(filtro).length ? { $and: [filtro, e] } : e;
};

// Existe algum registro que bate com `filtro` e está FORA das Mostras deste(a) admin? Usado antes de
// alterar/apagar por id (ids que não existem não contam - a rota já não faz nada com eles).
module.exports.foraDoEscopo = async (req, Modelo, filtro) => {
	let e = await escopo(req);
	if (!e) return false;
	return !!(await Modelo.exists({ $and: [filtro, { $nor: [e] }] }));
};

// Filtro por ano (createdAt) pras coleções sem Mostra (Saberes) - null = sem restrição.
module.exports.escopoPorAno = async (req, campo) => {
	let anos = await module.exports.anosPermitidos(req);
	if (anos === null) return null;
	if (!anos.length) return { _id: null };
	return { $or: anos.map((a) => ({ [campo || 'createdAt']: intervaloAno(a) })) };
};
