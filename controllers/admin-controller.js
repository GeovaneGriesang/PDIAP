'use strict';

const Admin = require('../models/admin-schema')
,	Feira = require('../models/feira-schema')
,	{ computaPrazo } = require('../utils/prazo');

// Usadas tanto pela home pública (routes/index.js) quanto pelo painel admin
// (routes/admin.js) — antes cada arquivo tinha sua própria cópia da mesma query.
module.exports.getEdicaoAtual = async (callback) => {
	try {
		let docs = await Admin.find({'username':'admin2'},
			'dias mes ano edicao cadastro_avaliadores cadastro_projetos saberes_docentes solicitacao_escola text prazoProjetos prazoAvaliadores botoes destaques -_id');
		if (!docs || !docs[0]) return callback(null, docs);
		var raw = docs[0].toObject();
		var statusProjetos = computaPrazo(raw.prazoProjetos, raw.cadastro_projetos);
		var statusAvaliadores = computaPrazo(raw.prazoAvaliadores, raw.cadastro_avaliadores);
		raw.cadastro_projetos = statusProjetos.visivel;
		raw.cadastro_avaliadores = statusAvaliadores.visivel;
		raw.textoProjetos = statusProjetos.texto;
		raw.textoAvaliadores = statusAvaliadores.texto;
		callback(null, [raw]);
	} catch (err) {
		callback(err);
	}
}

module.exports.getOpcoesAtuais = (callback) => {
	Admin.find({'username':'admin2'}, 'opcoes -_id').then(
		(docs) => callback(null, docs),
		(err) => callback(err)
	);
}

// Lista as Mostras (Feira tipo:'edicao') com o status de inscrição (aberta/prorrogada/
// encerrada) de projetos e avaliadores calculado a partir do prazo PRÓPRIO de cada uma -
// usada pela home pública e pelos formulários de inscrição (Fase 2, ver memória
// project-mostra-ano-nao-unico) pra saber que link/texto mostrar por edição.
//
// IMPORTANTE (compatibilidade com dados antigos): toda Mostra cadastrada antes desta
// frente não tem prazoProjetos/prazoAvaliadores gravado no banco - mas o Mongoose aplica
// o default do schema ({ativo:true}) mesmo assim ao ler via find() normal, o que faria
// esse botão aparecer "aberto" sozinho mesmo que o prazo GLOBAL de sempre (Admin
// singleton, ver getEdicaoAtual acima) esteja fechado hoje. Por isso usa .lean() (pula
// os defaults, mostra só o que está gravado de verdade) e, quando a Mostra nunca
// configurou seu próprio prazo (campo ausente de verdade, não só "fechado"), cai pro
// prazo/toggle do singleton Admin - o mesmo critério que já valia pra essa edição antes
// desta frente existir, então nada muda pra quem nunca mexeu no campo novo.
module.exports.getEdicoesInscricao = async (callback) => {
	try {
		let admin = await Admin.findOne({ username: 'admin2' }, 'cadastro_projetos cadastro_avaliadores prazoProjetos prazoAvaliadores');
		let docs = await Feira.find({ tipo: 'edicao' }, 'nome slug ano prazoProjetos prazoAvaliadores').lean();
		var edicoes = (docs || []).map((doc) => {
			var prazoProjetos = doc.prazoProjetos !== undefined ? doc.prazoProjetos : (admin && admin.prazoProjetos);
			var fallbackAtivoProjetos = doc.prazoProjetos !== undefined ? undefined : (admin && admin.cadastro_projetos);
			var prazoAvaliadores = doc.prazoAvaliadores !== undefined ? doc.prazoAvaliadores : (admin && admin.prazoAvaliadores);
			var fallbackAtivoAvaliadores = doc.prazoAvaliadores !== undefined ? undefined : (admin && admin.cadastro_avaliadores);
			var statusProjetos = computaPrazo(prazoProjetos, fallbackAtivoProjetos);
			var statusAvaliadores = computaPrazo(prazoAvaliadores, fallbackAtivoAvaliadores);
			return {
				_id: doc._id,
				nome: doc.nome,
				slug: doc.slug,
				ano: doc.ano,
				projetos: { aberto: statusProjetos.visivel, texto: statusProjetos.texto },
				avaliadores: { aberto: statusAvaliadores.visivel, texto: statusAvaliadores.texto }
			};
		});
		callback(null, edicoes);
	} catch (err) {
		callback(err);
	}
}