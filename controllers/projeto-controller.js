'use strict';

const bcrypt = require('bcryptjs')
,	Projeto = require('../models/projeto-schema')
,	Admin = require('../models/admin-schema');

module.exports.createProject = async (newProject, callback) => {
	try {
		let salt = await bcrypt.genSalt(10);
		let hash = await bcrypt.hash(newProject.password, salt);
		newProject.password = hash;
		let data = await newProject.save();
		callback(null, data);
	} catch (err) {
		console.error(err);
		callback(err);
	}
}

// NOVO LOGIN ÚNICO

module.exports.getLoginProjeto = async (username, ano_atual, user) => {
	try {
		let query = {username: username};
		let documentos = await Projeto.find(query);

		// A mesma conta pode ter projeto de edições anteriores - só vale o do ano.
		let doAnoAtual = (documentos || []).filter(function(value){
			return ano_atual == new Date(value.createdAt).getFullYear();
		});

		if (doAnoAtual.length) {
			// Um callback só. O código antigo chamava dentro de um forEach, então
			// com dois projetos do mesmo ano o passport era chamado duas vezes.
			let projeto = await Projeto.findOne({_id: doAnoAtual[0]._id});
			return user(null, projeto);
		} else {
			// Inclui o caso "tem projeto, mas de outro ano": antes o forEach não
			// chamava o callback nenhuma vez e o POST /login ficava pendurado, sem
			// resposta e sem erro, até o timeout do navegador.
			console.log("PROJETO_CONTROLLER -> Usuário desconhecido");
			let projeto = await Projeto.findOne({username:''});
			return user(null, projeto);
		}
	} catch (err) {
		console.error('Erro ao realizar login', err);
		return user(err);
	}
}

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
