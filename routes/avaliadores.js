'use strict';

const express = require('express')
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
		turnos: req.body.turnos
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

router.put('/addNota', (req, res) => {
	let id = req.body.id
	,	arrayNota = req.body.adrovan;

	ProjetoSchema.findOne({_id: id}, (err, usr) => {
		if (err) throw err;
		usr.avaliacao = arrayNota;
		usr.save((err, usr) => {
			if (err) throw err;
		});
	});
	res.send(200);
	console.log("Feito adrovão");
});

module.exports = router;
