'use strict';

const express = require('express')
, router = express.Router()
, passport = require('passport')
, LocalStrategy = require('passport-local').Strategy
, Saberes = require('../controllers/saberes-controller')
, session = require('express-session')
, SaberesSchema = require('../models/saberes-schema')
, nodemailer = require('nodemailer')
, EmailTemplate = require('email-templates').EmailTemplate
, path = require('path');

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
		resumo: req.body.resumo,
		createdAt: Date.now()
	});

	Saberes.createSaberes(newSaberes, (callback) => {});

	// E-mail de confirmação de inscrição, no mesmo padrão usado pra projetos/avaliadores.
	// Antes não existia nenhum envio aqui.
	var templatesDir = path.resolve(__dirname, '..', 'templates');
	var template = new EmailTemplate(path.join(templatesDir, 'inscricaosaberes'));
	const transport = nodemailer.createTransport({
		host: 'smtp.gmail.com',
		port: 587,
		auth: {
			user: "contatomovaci@gmail.com",
			pass: process.env.SMTP_GMAIL_PASS
		}
	});
	var locals = {
		nome: req.body.nome,
		email: req.body.email
	};
	template.render(locals, function (err, results) {
		if (err) { console.error(err); return; }
		transport.sendMail({
			from: 'MOVACI <contatomovaci@gmail.com>',
			to: locals.email,
			subject: 'MOVACI - Confirmação de inscrição em Saberes Docentes',
			html: results.html,
			text: results.text
		}, function (err) {
			if (err) { console.error(err); return; }
		});
	});

	res.send('success');
});

module.exports = router;
