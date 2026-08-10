'use strict';

const express = require('express')
, nodemailer = require('nodemailer')
, smtpTransport = require('nodemailer-smtp-transport')
, EmailTemplate = require('email-templates').EmailTemplate
, path = require('path')
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
	// A tela de inscrição de avaliadores do master (public/admin/views/avaliadores.html) reusa
	// esta mesma rota e já tem um filtro de ano no cabeçalho; permite que esse ano seja usado
	// para cadastrar avaliadores em anos anteriores, em vez de sempre cair no ano atual.
	// Na inscrição pública normal (site), "ano" nunca é enviado e o comportamento não muda.
	let anoInformado = parseInt(req.body.ano, 10);
	let anoValido = !isNaN(anoInformado) && anoInformado >= 2016 && anoInformado <= new Date().getFullYear();
	let createdAt = anoValido ? new Date(new Date().setFullYear(anoInformado)) : Date.now();

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
		createdAt: createdAt
	});
		

	Avaliador.createAvaliador(newAvaliador, (callback) => {});

	// E-mail de confirmação de inscrição, no mesmo padrão usado pra projetos (routes/index.js).
	// O template já existia (templates/inscricaoavaliador) mas nunca tinha sido escrito nem
	// conectado a esta rota — o e-mail nunca era enviado de fato.
	var templatesDir = path.resolve(__dirname, '..', 'templates');
	var template = new EmailTemplate(path.join(templatesDir, 'inscricaoavaliador'));
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
			subject: 'MOVACI - Confirmação de inscrição de avaliador',
			html: results.html,
			text: results.text
		}, function (err) {
			if (err) { console.error(err); return; }
		});
	});

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
