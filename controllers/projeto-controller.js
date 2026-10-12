'use strict';

const bcrypt = require('bcryptjs')
,	Projeto = require('../models/projeto-schema')
,	Admin = require('../models/admin-schema');

// O login próprio do projeto (getLoginProjeto/createProject com senha) acabou - os integrantes
// entram com a própria conta (painel único). Aqui ficou só o login da conta admin2.

module.exports.getLoginAdmin = (username, user) => {
	Admin.findOne({ username: username }).then(
		(admin) => user(null, admin),
		(err) => user(err)
	);
}

module.exports.compareLogin = (candidatePassword, hash, callback) => {
	try {
	bcrypt.compare(candidatePassword, hash, (err, isMatch) => {
    	if (err) { console.error('Erro ao realizar login', err); return; }
    	callback(null, isMatch);
	});
} catch (error) {
	console.log('findOne error--> ${error}'); // Alteração Lucas Ferreira
}
}

// NOVO LOGIN ÚNICO

/*
module.exports.findOneAndUpdateProjeto = (query, username, password, email, name, doc, callback) => {
	Projeto.findOneAndUpdate(query, { username: username, password: password, email: email, name: name }, {new: true}, (err, doc) => {
    if(err){
        console.log("Something wrong when updating data!");
    }

    console.log(doc);
});}*/
