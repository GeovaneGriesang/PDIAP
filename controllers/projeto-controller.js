'use strict';

const mongoose = require('mongoose')
,	bcrypt = require('bcryptjs')
,	Projeto = require('../models/projeto-schema')
,	Admin = require('../models/admin-schema');

module.exports.createProject = (newProject, callback) => {
	bcrypt.genSalt(10, (err, salt) => {
	    bcrypt.hash(newProject.password, salt, (err, hash) => {
	        newProject.password = hash;
	        //newProject.save(callback);
	        newProject.save((err, data) => {
	        	if(err) throw err;
	        	console.log(data);
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

module.exports.getLoginProjeto = (username, user) => {
	let query = {username: username};
	Projeto.findOne(query, user);
}

module.exports.getLoginAdmin = (username, user) => {
	let query = {username: username};
	Admin.findOne(query, user);
}

module.exports.compareLogin = (candidatePassword, hash, callback) => {
	bcrypt.compare(candidatePassword, hash, (err, isMatch) => {
    	if(err) throw err;
    	callback(null, isMatch);
	});
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
	bcrypt.compare(candidatePassword, hash, (err, isMatch) => {
    	if(err) throw err;
    	callback(null, isMatch);
	});
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