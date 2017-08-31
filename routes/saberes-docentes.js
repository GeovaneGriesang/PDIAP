'use strict';

const express = require('express')
, router = express.Router()
, passport = require('passport')
, LocalStrategy = require('passport-local').Strategy
, Saberes = require('../controllers/saberes-controller')
, session = require('express-session')
, SaberesSchema = require('../models/saberes-schema');

function splita(arg){
  if (arg !== undefined) {
    let data = arg.replace(/([-.() ])/g,'');
    return data;
  }
}

function testaEscola(req, res) {
  SaberesSchema.find('escola','escola -_id', (error, escolas) => {
    if(error) {
      return res.status(400).send({msg:"error occurred"});
    } else
      return res.status(200).send(escolas);
  });
}

router.get('/registro', testaEscola, (req, res) => {});

router.post('/registro', (req, res) => {

	let newSaberes = new SaberesSchema({
    tipo: req.body.tipo,
		nome: req.body.nome,
		email: req.body.email,
		cpf: splita(req.body.cpf),
		telefone: splita(req.body.telefone),
		escola: req.body.escola,
    resumo: req.body.resumo
	});

	Saberes.createSaberes(newSaberes, (callback) => {});
	res.send('success');
});

module.exports = router;