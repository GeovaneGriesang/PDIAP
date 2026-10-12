'use strict';

// Juntar dois cadastros da MESMA pessoa (Admin > Inconsistências > Cadastro, só super-admin): o
// que fica ("manter") recebe tudo o que está ligado ao outro ("remover") - papéis, integrantes de
// projeto, responsável de evento, Saberes, administração de Mostra - e o outro é apagado.
//
// Regras: dados do que fica valem; o que faltar nele vem do outro (documento, nome completo,
// nacionalidade, telefone, senha própria). E-mails: os dos dois (até 3 - passou disso, recusa).
// Registros que vêm do outro passam a ter o documento final (o certificado sai pelo documento).
// Antes de mexer, grava os dois cadastros inteiros em `pessoasMescladas` (pra desfazer à mão).

const mongoose = require('mongoose')
,	Pessoa = require('../models/pessoa-schema')
,	Avaliador = require('../models/avaliador-schema')
,	Participante = require('../models/participante-schema')
,	Projeto = require('../models/projeto-schema')
,	Evento = require('../models/evento-schema')
,	Saberes = require('../models/saberes-schema')
,	Feira = require('../models/feira-schema')
,	pessoaController = require('./pessoa-controller')
,	pendencias = require('../utils/pendencias');

function idValido(id) {
	return typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
}
const regexDoc = (doc) => new RegExp('^' + String(doc).replace(/[^0-9A-Za-z]/g, '') + '$', 'i');

// Registros ligados à Pessoa: pelo vínculo ou, sem vínculo, pelo documento dela.
function filtroDaPessoa(p) {
	let c = [{ pessoa: p._id }];
	if (p.documento) c.push({ pessoa: null, cpf: regexDoc(p.documento) });
	return { $or: c };
}

// Resumo pra tela decidir qual fica.
module.exports.detalhes = async (ids) => {
	let lista = [];
	for (let id of ids.filter(idValido)) {
		let p = await Pessoa.findById(id, 'nome email emailsAlternativos documento nacionalidade telefone senhaDefinida superAdmin createdAt').lean();
		if (!p) continue;
		let f = filtroDaPessoa(p);
		let [avaliador, participante, integrante, evento, saberes, admin] = await Promise.all([
			Avaliador.countDocuments(f), Participante.countDocuments(f),
			Projeto.countDocuments({ integrantes: { $elemMatch: f } }), Evento.countDocuments({ responsavel: { $elemMatch: f } }),
			Saberes.countDocuments(f), Feira.countDocuments({ administradores: p._id })
		]);
		p.vinculos = { avaliador, participante, projetos: integrante, eventos: evento, saberes, administraMostras: admin };
		lista.push(p);
	}
	return lista;
};

module.exports.mesclar = async (manterId, removerId, quem) => {
	if (!idValido(manterId) || !idValido(removerId) || manterId === removerId) return { erro: 'Escolha dois cadastros diferentes.' };
	let a = await Pessoa.findById(manterId), b = await Pessoa.findById(removerId);
	if (!a || !b) return { erro: 'Cadastro não encontrado (talvez já tenha sido juntado).' };
	// Documentos diferentes: fica o do cadastro mantido (quem junta confirma que é a mesma pessoa).
	let emails = [];
	pessoaController.emailsDa(a).concat(pessoaController.emailsDa(b)).forEach((e) => {
		if (!emails.some((x) => pessoaController.mesmoEmail(x, e))) emails.push(e.trim().toLowerCase());
	});
	if (emails.length > pessoaController.MAX_EMAILS) return { erro: 'Juntos, os cadastros têm ' + emails.length + ' e-mails (máximo ' + pessoaController.MAX_EMAILS + '). Remova algum antes.' };

	let antesA = a.toObject(), antesB = b.toObject();
	let docFinal = a.documento || b.documento;
	await mongoose.connection.db.collection('pessoasMescladas').insertOne({ em: new Date(), por: quem, mantida: antesA, removida: antesB });

	// O outro sai primeiro (o documento é único - o mantido pode herdar o dele).
	await Pessoa.deleteOne({ _id: b._id });
	a.email = emails[0];
	a.emailsAlternativos = emails.slice(1);
	if (!a.documento && b.documento) a.documento = b.documento;
	if (!pendencias.nomeCompleto(a.nome) && pendencias.nomeCompleto(b.nome)) a.nome = b.nome;
	if (pendencias.NACIONALIDADES.indexOf(a.nacionalidade) === -1 && b.nacionalidade) a.nacionalidade = b.nacionalidade;
	if (!a.telefone && b.telefone) a.telefone = b.telefone;
	if (!a.senhaDefinida && b.senhaDefinida) { a.password = b.password; a.senhaDefinida = true; }
	if (b.superAdmin) a.superAdmin = true;
	await a.save();

	// Tudo que era do outro passa pro mantido, com o documento final.
	let fb = filtroDaPessoa(antesB);
	let setPapel = { pessoa: a._id };
	if (docFinal) setPapel.cpf = docFinal;
	let r = {};
	r.avaliadores = (await Avaliador.updateMany(fb, { $set: setPapel })).modifiedCount;
	r.participantes = (await Participante.updateMany(fb, { $set: setPapel })).modifiedCount;
	r.saberes = (await Saberes.updateMany(fb, { $set: setPapel })).modifiedCount;
	let filtroSub = [{ 'eu.pessoa': b._id }];
	if (antesB.documento) filtroSub.push({ 'eu.pessoa': null, 'eu.cpf': regexDoc(antesB.documento) });
	let setInteg = { 'integrantes.$[eu].pessoa': a._id }, setResp = { 'responsavel.$[eu].pessoa': a._id };
	if (docFinal) { setInteg['integrantes.$[eu].cpf'] = docFinal; setResp['responsavel.$[eu].cpf'] = docFinal; }
	r.projetos = (await Projeto.updateMany({ integrantes: { $elemMatch: fb } }, { $set: setInteg }, { arrayFilters: [{ $or: filtroSub }] })).modifiedCount;
	r.eventos = (await Evento.updateMany({ responsavel: { $elemMatch: fb } }, { $set: setResp }, { arrayFilters: [{ $or: filtroSub }] })).modifiedCount;
	let mostras = await Feira.find({ administradores: b._id }, '_id');
	for (let m of mostras) {
		await Feira.updateOne({ _id: m._id }, { $addToSet: { administradores: a._id } });
		await Feira.updateOne({ _id: m._id }, { $pull: { administradores: b._id } });
	}
	r.mostras = mostras.length;
	return { pessoa: { _id: a._id, nome: a.nome, email: a.email, emailsAlternativos: a.emailsAlternativos, documento: a.documento }, movidos: r };
};
