'use strict';

const mongoose = require('mongoose')
,	bcrypt = require('bcryptjs')
,	Admin = require('../models/admin-schema');

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

// Calcula o estágio atual (aberto / prorrogado / encerrado) de um prazo de inscrição.
// 'fallbackAtivo' é o boolean manual antigo (cadastro_projetos/cadastro_avaliadores),
// usado só enquanto o admin não configurou um prazoProjetos/prazoAvaliadores novo.
function _computaPrazo(prazo, fallbackAtivo) {
	var ativo = (prazo && prazo.ativo !== undefined) ? prazo.ativo : (fallbackAtivo !== undefined ? fallbackAtivo : true);
	if (!ativo) return { visivel: false, texto: (prazo && prazo.textoEncerrado) || '' };
	if (!prazo || !prazo.dataPrazo) return { visivel: true, texto: (prazo && prazo.textoPrazo) || '' };
	var agora = new Date();
	if (agora <= new Date(prazo.dataPrazo)) return { visivel: true, texto: prazo.textoPrazo || '' };
	if (prazo.dataProrrogacao && agora <= new Date(prazo.dataProrrogacao)) return { visivel: true, texto: prazo.textoProrrogacao || '' };
	return { visivel: false, texto: prazo.textoEncerrado || '' };
}

// Usadas tanto pela home pública (routes/index.js) quanto pelo painel admin
// (routes/admin.js) — antes cada arquivo tinha sua própria cópia da mesma query.
module.exports.getEdicaoAtual = (callback) => {
	Admin.find({'username':'admin2'},
		'dias mes ano edicao cadastro_avaliadores cadastro_projetos saberes_docentes solicitacao_escola text prazoProjetos prazoAvaliadores botoes destaques -_id',
		(err, docs) => {
			if (err || !docs || !docs[0]) return callback(err, docs);
			var raw = docs[0].toObject();
			var statusProjetos = _computaPrazo(raw.prazoProjetos, raw.cadastro_projetos);
			var statusAvaliadores = _computaPrazo(raw.prazoAvaliadores, raw.cadastro_avaliadores);
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