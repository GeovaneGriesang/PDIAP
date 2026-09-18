'use strict';

const mongoose = require('mongoose')
,	bcrypt = require('bcryptjs')
,	Admin = require('../models/admin-schema')
,	Feira = require('../models/feira-schema')
,	{ computaPrazo } = require('../utils/prazo');

module.exports.createAdmin = (newAdmin, callback) => {
	try {
		bcrypt.genSalt(10, (err, salt) => {
			bcrypt.hash(newAdmin.password, salt, (err, hash) => {
				newAdmin.password = hash;
				//newProject.save(callback);
				newAdmin.save((err, data) => {
					if (err) { console.error('Erro ao criar admin', err); return; }
				});
			});
		});
	} catch (error) {
		console.log('findOne error--> ${error}');
	}
}

module.exports.getAdminByEmail = (username, callback) => {
	let query = {username: username};
	Admin.findOne(query, callback);
}

module.exports.getAdminByUsername = (username, callback) => {
	let query = {username: username};
	Admin.findOne(query, callback);
}

module.exports.getAdmins = (req, res) => {
  const query = getQuery(req);
  Admin.find(query, (err, data) => callback(err, data, res));
};

module.exports.getAdminById = (id, callback) => {
	Admin.findById(id, callback);
}

module.exports.comparePassword = (candidatePassword, hash, callback) => {
	try {
		bcrypt.compare(candidatePassword, hash, (err, isMatch) => {
			if (err) { console.error('Erro ao comparar senha', err); return; }
			callback(null, isMatch);
		});
	} catch (error) {
		console.log('findOne error--> ${error}');
	}
}

// Usadas tanto pela home pública (routes/index.js) quanto pelo painel admin
// (routes/admin.js) — antes cada arquivo tinha sua própria cópia da mesma query.
module.exports.getEdicaoAtual = (callback) => {
	Admin.find({'username':'admin2'},
		'dias mes ano edicao cadastro_avaliadores cadastro_projetos saberes_docentes solicitacao_escola text prazoProjetos prazoAvaliadores botoes destaques -_id',
		(err, docs) => {
			if (err || !docs || !docs[0]) return callback(err, docs);
			var raw = docs[0].toObject();
			var statusProjetos = computaPrazo(raw.prazoProjetos, raw.cadastro_projetos);
			var statusAvaliadores = computaPrazo(raw.prazoAvaliadores, raw.cadastro_avaliadores);
			raw.cadastro_projetos = statusProjetos.visivel;
			raw.cadastro_avaliadores = statusAvaliadores.visivel;
			raw.textoProjetos = statusProjetos.texto;
			raw.textoAvaliadores = statusAvaliadores.texto;
			callback(err, [raw]);
		});
}

module.exports.getOpcoesAtuais = (callback) => {
	Admin.find({'username':'admin2'}, 'opcoes -_id', callback);
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
module.exports.getEdicoesInscricao = (callback) => {
	Admin.findOne({ username: 'admin2' }, 'cadastro_projetos cadastro_avaliadores prazoProjetos prazoAvaliadores', (err, admin) => {
		if (err) return callback(err);
		Feira.find({ tipo: 'edicao' }, 'nome slug ano prazoProjetos prazoAvaliadores').lean().exec((err2, docs) => {
			if (err2) return callback(err2);
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
		});
	});
}