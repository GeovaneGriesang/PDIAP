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
					if(err) throw new Error('Erro ao criar admin'); // Alteração Lucas Ferreira
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
			if(err) throw new Error('Erro ao comparar senha'); // Alteração Lucas Ferreira
			callback(null, isMatch);
		});
	} catch (error) {
		console.log('findOne error--> ${error}');
	}
}

// Usadas tanto pela home pública (routes/index.js) quanto pelo painel admin
// (routes/admin.js) — antes cada arquivo tinha sua própria cópia da mesma query.
module.exports.getEdicaoAtual = (callback) => {
	Admin.find({'username':'admin2'}, 'dias mes ano edicao cadastro_avaliadores cadastro_projetos saberes_docentes text -_id', callback);
}

module.exports.getOpcoesAtuais = (callback) => {
	Admin.find({'username':'admin2'}, 'opcoes -_id', callback);
}