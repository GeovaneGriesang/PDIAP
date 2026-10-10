'use strict';

const express = require('express')
, router = express.Router()
, passport = require('passport')
, LocalStrategy = require('passport-local').Strategy
, Saberes = require('../controllers/saberes-controller')
, session = require('express-session')
, SaberesSchema = require('../models/saberes-schema')
, nodemailer = require('nodemailer')
, EmailTemplate = require('../utils/emailTemplate').EmailTemplate
, path = require('path')
, documentoValidator = require('../utils/documentoValidator')
, pessoaController = require('../controllers/pessoa-controller');

function splita(arg){
  if (arg !== undefined) {
    let data = arg.replace(/([-.() ])/g,'');
    return data;
  }
}

async function testaEscola(req, res) {
  try {
    // Bug pré-existente encontrado ao testar esta migração (não é regressão daqui): o
    // primeiro argumento era a STRING 'escola' em vez de um filtro {} - o Mongoose sempre
    // rejeitou isso (confirmado testando o código antigo, com callback, mesmo erro), então
    // esta rota sempre devolveu 400 hoje. Corrigido pra filtro vazio (busca todos), que é o
    // que o resto do código claramente espera (lista de escolas pro formulário público).
    let escolas = await SaberesSchema.find({}, 'escola -_id');
    return res.status(200).send(escolas);
  } catch (error) {
    return res.status(400).send({msg:"error occurred"});
  }
}

router.get('/registro', testaEscola, (req, res) => {});

router.post('/registro', async (req, res) => {
	// Antes não validava nada. Documento de qualquer país (ver utils/documentoValidator.js),
	// telefone e e-mail - os mesmos mínimos de qualquer pessoa do sistema.
	if (!(req.body.nome || '').trim()) return res.status(400).send('Informe o nome completo.');
	if (!req.body.email || !/^.+@.+\..+$/.test(req.body.email)) return res.status(400).send('Informe um e-mail válido.');
	let checagemDoc = documentoValidator.validarDocumentoQualquerPais(req.body.cpf);
	if (!checagemDoc.valido) return res.status(400).send(checagemDoc.mensagem);
	let checagemTelefone = documentoValidator.validarTelefone(req.body.telefone);
	if (!checagemTelefone.valido) return res.status(400).send(checagemTelefone.mensagem);

	let newSaberes = new SaberesSchema({
    		tipo: req.body.tipo,
		nome: req.body.nome,
		email: req.body.email,
		cpf: checagemDoc.normalizado,
		telefone: checagemTelefone.normalizado,
		escola: req.body.escola,
		resumo: req.body.resumo,
		createdAt: Date.now()
	});

	// Liga ao cadastro único (inscrição pública: Pessoa existente só se o e-mail bater).
	newSaberes.pessoa = await pessoaController.vincularPessoa({
		cpf: newSaberes.cpf, nome: newSaberes.nome, email: newSaberes.email, telefone: newSaberes.telefone
	});

	try {
		await Saberes.createSaberes(newSaberes);
	} catch (error) {
		console.error('Erro ao registrar saberes docentes', error);
		return res.status(500).send('Erro ao registrar a inscrição.');
	}

	// E-mail de confirmação de inscrição, no mesmo padrão usado pra projetos/avaliadores.
	// Antes não existia nenhum envio aqui.
	var templatesDir = path.resolve(__dirname, '..', 'templates');
	var template = new EmailTemplate(path.join(templatesDir, 'inscricaosaberes'));
	const transport = nodemailer.createTransport({
		host: 'smtp.gmail.com',
		port: 587,
		auth: {
			user: process.env.SMTP_GMAIL_USER,
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
			from: 'MOVACI <va-movaci@ifsul.edu.br>',
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
