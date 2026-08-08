'use strict';

const express = require('express')
, nodemailer = require('nodemailer')
, smtpTransport = require('nodemailer-smtp-transport')
, EmailTemplate = require('email-templates').EmailTemplate
, router = express.Router()
, passport = require('passport')
, LocalStrategy = require('passport-local').Strategy
, Avaliador = require('../controllers/avaliador-controller')
, session = require('express-session')
, ProjetoSchema = require('../models/projeto-schema')
, AvaliadorSchema = require('../models/avaliador-schema');

function splita(arg){
  if (arg !== undefined) {
    let data = arg.replace(/([-.() ])/g,'');
    return data;
  }
}

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated())
  return next();
  else{
    res.send('0');
  }
}

function idValido(id) {
  return typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
}

router.get('/', function(req, res, next) {
  res.send('Avaliadores mt loucos nóis');
});

router.post('/registro', (req, res) => {
	let newAvaliador = AvaliadorSchema({
		nome: req.body.nome,
		email: req.body.email,
		cpf: splita(req.body.cpf),
		rg: splita(req.body.rg),
		dtNascimento: req.body.dtNascimento,
		nivelAcademico: req.body.nivelAcademico,
		categoria: req.body.categoria,
		eixo: req.body.eixo,
		atuacaoProfissional: req.body.atuacaoProfissional,
		tempoAtuacao: req.body.tempoAtuacao,
		telefone: splita(req.body.telefone),
		curriculo: req.body.curriculo,
		turnos: req.body.turnos,
		avaliacao: req.body.avaliacao,
		createdAt: Date.now()
	});
		

	Avaliador.createAvaliador(newAvaliador, (callback) => {});
	res.send('success');
});

router.post('/login', passport.authenticate('admin2'), (req, res) => {
  res.send(req.user);
  //res.redirect('/home');
  //res.cookie('userid', user.id, { maxAge: 2592000000 });  // Expires in one month
});

router.get('/loggedin', ensureAuthenticated, (req, res) => {
  res.send('success');
});

router.put('/addNota', ensureAuthenticated, (req, res) => {
	try {
	let id = req.body.id
	,	arrayNota = req.body.adrovan;
	if (!idValido(id)) return res.status(400).send('ID inválido');

	ProjetoSchema.findOne({_id: id}, (err, usr) => {
		if (err) { console.error('Erro', err); return; }
		usr.avaliacao = arrayNota;
		usr.save((err, usr) => {
			if (err) { console.error('Erro', err); return; }
		});
	});
	res.send(200);
	console.log("Feito adrovão");

	} catch (error) {
		console.log("ProjetoSchema.finOne: " + err); // Alteração Lucas Ferreira
	}
});

module.exports = router;
