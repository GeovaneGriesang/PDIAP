'use strict';

const mongoose = require('mongoose')
,	bcrypt = require('bcryptjs')
,	Projeto = require('../models/projeto-schema')
,	Admin = require('../models/admin-schema');

module.exports.createProject = (newProject, callback) => {
	bcrypt.genSalt(10, (err, salt) => {
		if (err) { console.error(err); return callback(err); }
		bcrypt.hash(newProject.password, salt, (err, hash) => {
			if (err) { console.error(err); return callback(err); }
			newProject.password = hash;
			newProject.save((err, data) => {
				if (err) { console.error(err); return callback(err); }
				callback(null, data);
			});
		});
	});
}

// module.exports.createProject = (newProject, callback) => {
// 	bcrypt.genSalt(10, (err, salt) => {
// 	    bcrypt.hash(newProject.password, salt, (err, hash) => {
// 	        newProject.password = hash;
// 	        newProject.save(callback);
// 	    });
// 	});
// }

module.exports.getProjectByEmail = (username, callback) => {
	let query = {email: username};
	Projeto.findOne(query, callback);
}

module.exports.getProjectByUsername = (username, callback) => {
	let query = {username: username};
	Projeto.findOne(query, callback);
}



// NOVO LOGIN ÚNICO

module.exports.getLoginProjeto = (username, ano_atual, user) => {
	try {
		let query = {username: username};
		Projeto.find(query, function(err, documentos){
			if (err) { console.error('Erro ao realizar login', err); return user(err); }

			// A mesma conta pode ter projeto de edições anteriores - só vale o do ano.
			let doAnoAtual = (documentos || []).filter(function(value){
				return ano_atual == new Date(value.createdAt).getFullYear();
			});

			if (doAnoAtual.length) {
				// Um callback só. O código antigo chamava dentro de um forEach, então
				// com dois projetos do mesmo ano o passport era chamado duas vezes.
				Projeto.findOne({_id: doAnoAtual[0]._id}, user);
			} else {
				// Inclui o caso "tem projeto, mas de outro ano": antes o forEach não
				// chamava o callback nenhuma vez e o POST /login ficava pendurado, sem
				// resposta e sem erro, até o timeout do navegador.
				console.log("PROJETO_CONTROLLER -> Usuário desconhecido");
				Projeto.findOne({username:''}, user);
			}
		});
	} catch (error) {
		console.log('findOne error--> ${error}'); // Alteração Lucas Ferreira
	}
	
}

module.exports.getLoginAdmin = (username, user) => {
	let query = {username: username};
	Admin.findOne(query, user);
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



module.exports.getProjects = (req, res) => {
  const query = getQuery(req);
  Projeto.find(query, (err, data) => callback(err, data, res));
};

module.exports.getProjectById = (id, callback) => {
	Projeto.findById(id, callback);
}

module.exports.comparePassword = (candidatePassword, hash, callback) => {
	try {
		bcrypt.compare(candidatePassword, hash, (err, isMatch) => {
			if (err) { console.error('Erro ao comparar senhas', err); return; }
			callback(null, isMatch);
		});
	} catch (error) {
		console.log('findOne error--> ${error}'); // Alteração Lucas Ferreira
	}
}

module.exports.findAll = (callback) => {
	Projeto.find(callback);
}

/*
module.exports.findOneAndUpdateProjeto = (query, username, password, email, name, doc, callback) => {
	Projeto.findOneAndUpdate(query, { username: username, password: password, email: email, name: name }, {new: true}, (err, doc) => {
    if(err){
        console.log("Something wrong when updating data!");
    }

    console.log(doc);
});}*/
