'use strict';

// Remover uma Mostra (Feira tipo:'edicao') - Mostra > Configuração, só super-admin. Pensado
// pra Mostra de teste: antes de apagar, a tela mostra o que está ligado a ela (vinculos) e,
// confirmando, apaga a Mostra e tudo o que é dela (registros com o mesmo feiraId), sem
// deixar nada órfão. A Mostra atual não pode ser removida (trocar em Sistema > Mostra atual).
// Antes de apagar, grava tudo em `mostrasRemovidas` (pra recuperar à mão se precisar).
// Feira filiada (tipo diferente de 'edicao') não tem vínculos por feiraId: só é apagada.

const mongoose = require('mongoose')
,	Feira = require('../models/feira-schema')
,	Admin = require('../models/admin-schema')
,	Projeto = require('../models/projeto-schema')
,	Avaliador = require('../models/avaliador-schema')
,	Participante = require('../models/participante-schema')
,	AvaliacaoPrevia = require('../models/avaliacao-previa-schema')
,	AvaliacaoFinal = require('../models/avaliacao-final-schema')
,	Evento = require('../models/evento-schema')
,	Seminario = require('../models/seminario-schema')
,	Documento = require('../models/documento-schema')
,	Certificado = require('../models/cMostra-schema');

// chave -> [model, texto no singular, plural]
const VINCULOS = {
	projetos: [Projeto, 'projeto', 'projetos'],
	avaliadores: [Avaliador, 'avaliador(a)', 'avaliadores(as)'],
	participantes: [Participante, 'participante', 'participantes'],
	avaliacoesPrevias: [AvaliacaoPrevia, 'avaliação prévia', 'avaliações prévias'],
	avaliacoesFinais: [AvaliacaoFinal, 'avaliação final', 'avaliações finais'],
	eventos: [Evento, 'evento', 'eventos'],
	seminarios: [Seminario, 'seminário', 'seminários'],
	documentos: [Documento, 'documento', 'documentos'],
	certificados: [Certificado, 'certificado', 'certificados']
};

function idValido(id) {
	return typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
}

async function ehMostraAtual(id) {
	let adm = await Admin.findOne({ username: 'admin2' }, 'mostraAtual').lean();
	return !!(adm && adm.mostraAtual && String(adm.mostraAtual) === String(id));
}

// O que está ligado à Mostra: { feira, mostraAtual, total, itens: [{chave, n, texto}] }.
module.exports.vinculos = async (id) => {
	if (!idValido(id)) return null;
	let feira = await Feira.findById(id, 'nome ano tipo').lean();
	if (!feira) return null;
	let itens = [], total = 0;
	if (feira.tipo === 'edicao') {
		for (let chave of Object.keys(VINCULOS)) {
			let [Model, um, varios] = VINCULOS[chave];
			let n = await Model.countDocuments({ feiraId: feira._id });
			if (n) { itens.push({ chave, n, texto: n + ' ' + (n === 1 ? um : varios) }); total += n; }
		}
	}
	return { feira, mostraAtual: await ehMostraAtual(id), total, itens };
};

// Apaga a Mostra e o que é dela. Retorna { ok } ou { erro, status }.
module.exports.remover = async (id, quem) => {
	let v = await module.exports.vinculos(id);
	if (!v) return { erro: 'Mostra não encontrada.', status: 404 };
	if (v.mostraAtual) return { erro: 'Esta é a Mostra atual. Troque a Mostra atual (Sistema > Mostra atual) antes de remover.', status: 409 };

	let copia = { em: new Date(), por: quem, feira: await Feira.findById(id).lean(), registros: {} };
	if (v.feira.tipo === 'edicao') {
		for (let item of v.itens) copia.registros[item.chave] = await VINCULOS[item.chave][0].find({ feiraId: v.feira._id }).lean();
	}
	await mongoose.connection.db.collection('mostrasRemovidas').insertOne(copia);

	for (let item of v.itens) await VINCULOS[item.chave][0].deleteMany({ feiraId: v.feira._id });
	await Feira.deleteOne({ _id: v.feira._id });
	return { ok: true, apagados: v.itens };
};
