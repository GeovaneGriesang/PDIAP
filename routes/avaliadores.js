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
, crypto = require('crypto')
, bcrypt = require('bcryptjs')
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

// Garante que quem está autenticado é mesmo um Avaliador (não Projeto/Admin) - login
// único acontece em routes/index.js (strategy 'unico'), aqui só protege as rotas do
// dashboard próprio do avaliador.
function ensureAvaliador(req, res, next) {
  if (req.isAuthenticated() && req.user.constructor.modelName === 'Avaliador') {
    return next();
  }
  res.sendStatus(403);
}

router.get('/', function(req, res, next) {
  res.send('Avaliadores mt loucos nóis');
});

router.post('/registro', (req, res) => {
	let checagem = Avaliador.validarDocumento(req.body.nacionalidade, req.body.cpf);
	if (!checagem.valido) return res.status(400).send(checagem.mensagem);

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
		nacionalidade: req.body.nacionalidade,
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

router.get('/loggedin', ensureAuthenticated, (req, res) => {
  res.send('success');
});

// DASHBOARD DO AVALIADOR (login próprio) ===================================

router.get('/dashboard/loggedin', ensureAvaliador, (req, res) => {
  res.send({
    nome: req.user.nome,
    email: req.user.email,
    senhaDefinida: !!req.user.senhaDefinida,
    avaliacao: !!req.user.avaliacao
  });
});

// Troca de senha - funciona tanto pro primeiro acesso (senhaDefinida false, não exige
// senhaAtual - a "senha" usada pra logar nesse caso foi o documento) quanto pra troca
// voluntária estando logado (senhaDefinida true, exige senhaAtual correta).
router.post('/dashboard/trocar-senha', ensureAvaliador, (req, res) => {
  let novaSenha = req.body.novaSenha;
  if (!Avaliador.senhaForte(novaSenha)) {
    return res.status(400).send('A senha precisa ter de 8 a 12 caracteres, com maiúscula, minúscula, número e símbolo.');
  }

  AvaliadorSchema.findById(req.user._id, (err, avaliador) => {
    if (err) { console.error('Erro ao trocar senha de avaliador', err); return res.status(500).send('Erro ao trocar senha.'); }
    if (!avaliador) return res.status(404).send('Avaliador não encontrado.');

    let prosseguir = () => {
      bcrypt.genSalt(10, (err, salt) => {
        if (err) { console.error(err); return res.status(500).send('Erro ao trocar senha.'); }
        bcrypt.hash(novaSenha, salt, (err, hash) => {
          if (err) { console.error(err); return res.status(500).send('Erro ao trocar senha.'); }
          avaliador.password = hash;
          avaliador.senhaDefinida = true;
          avaliador.save((err) => {
            if (err) { console.error(err); return res.status(500).send('Erro ao trocar senha.'); }
            res.send('success');
          });
        });
      });
    };

    if (avaliador.senhaDefinida) {
      if (!req.body.senhaAtual) return res.status(400).send('Informe a senha atual.');
      bcrypt.compare(req.body.senhaAtual, avaliador.password, (err, isMatch) => {
        if (err) { console.error(err); return res.status(500).send('Erro ao trocar senha.'); }
        if (!isMatch) return res.status(400).send('Senha atual incorreta.');
        prosseguir();
      });
    } else {
      prosseguir();
    }
  });
});

// Recuperação de senha (esqueci a senha) - mesmo padrão de routes/index.js pro Projeto:
// token aleatório com expiração de 1h, enviado por e-mail.
router.post('/dashboard/redefinir-senha', (req, res) => {
  let email = req.body.email;
  AvaliadorSchema.findOne({ email: email }, (err, avaliador) => {
    if (err) { console.error('Erro ao redefinir senha de avaliador', err); return; }
    if (!avaliador) return res.status(404).send('E-mail não encontrado.');

    let token = crypto.randomBytes(20).toString('hex');
    AvaliadorSchema.findOneAndUpdate(
      { email: email },
      { $set: { resetPasswordToken: token, resetPasswordCreatedDate: Date.now() + 3600000 } },
      (err) => {
        if (err) { console.error(err); return; }
      }
    );

    res.send(email);

    var templatesDir = path.resolve(__dirname, '..', 'templates');
    var template = new EmailTemplate(path.join(templatesDir, 'redefinicao-avaliador'));
    const transport = nodemailer.createTransport({
      host: 'smtp.gmail.com', port: 587,
      auth: { user: "contatomovaci@gmail.com", pass: process.env.SMTP_GMAIL_PASS }
    });
    var locals = { email: email, nome: avaliador.nome, url: "http://www.movaci.com.br/avaliadores/dashboard/nova-senha/" + token };
    template.render(locals, function (err, results) {
      if (err) { console.error(err); return; }
      transport.sendMail({
        from: 'MOVACI <contatomovaci@gmail.com>',
        to: email,
        subject: 'MOVACI - Redefinição de senha (avaliador)',
        html: results.html,
        text: results.text
      }, function (err) {
        if (err) { console.error(err); return; }
      });
    });
  });
});

router.post('/dashboard/nova-senha/:token', (req, res) => {
  AvaliadorSchema.findOne({ resetPasswordToken: req.params.token }, (err, avaliador) => {
    if (err) { console.error('Erro ao definir nova senha de avaliador', err); return res.send('erro'); }
    if (!avaliador) return res.send('erro2');
    if (avaliador.hasExpired()) return res.send('erro3');
    if (!Avaliador.senhaForte(req.body.password)) {
      return res.status(400).send('A senha precisa ter de 8 a 12 caracteres, com maiúscula, minúscula, número e símbolo.');
    }

    bcrypt.genSalt(10, (err, salt) => {
      if (err) { console.error(err); return res.send('erro'); }
      bcrypt.hash(req.body.password, salt, (err, hash) => {
        if (err) { console.error(err); return res.send('erro'); }
        avaliador.password = hash;
        avaliador.senhaDefinida = true;
        avaliador.resetPasswordToken = undefined;
        avaliador.resetPasswordCreatedDate = undefined;
        avaliador.save((err) => {
          if (err) { console.error(err); return res.send('erro'); }
          res.send('Senha alterada');
        });
      });
    });
  });
});

// Dados pessoais - GET pra carregar a tela, PUT pra editar (campos de identidade como
// cpf/email/nome ficam de fora, só o admin altera esses hoje).
router.get('/dashboard/meus-dados', ensureAvaliador, (req, res) => {
  AvaliadorSchema.findById(req.user._id, '-password -resetPasswordToken -resetPasswordCreatedDate', (err, avaliador) => {
    if (err) { console.error('Erro ao buscar dados do avaliador', err); return; }
    res.send(avaliador);
  });
});

router.put('/dashboard/meus-dados', ensureAvaliador, (req, res) => {
  let campos = {
    telefone: splita(req.body.telefone),
    nivelAcademico: req.body.nivelAcademico,
    categoria: req.body.categoria,
    eixo: req.body.eixo,
    atuacaoProfissional: req.body.atuacaoProfissional,
    tempoAtuacao: req.body.tempoAtuacao,
    curriculo: req.body.curriculo
  };
  AvaliadorSchema.findByIdAndUpdate(req.user._id, { $set: campos }, { new: true }, (err, avaliador) => {
    if (err) { console.error('Erro ao atualizar dados do avaliador', err); return res.status(500).send('Erro ao salvar.'); }
    res.send('success');
  });
});

// Certificados disponíveis - mesma regra já usada na emissão pública por CPF
// (routes/index.js#pesquisaAvaliador): só quem tem presença confirmada (avaliacao:true)
// tem certificado. O token já existe sempre (gerado automaticamente no pre-save do
// schema), então aqui não precisa gerar nada, só devolver os dados de quem já está logado.
router.get('/dashboard/meus-certificados', ensureAvaliador, (req, res) => {
  if (!req.user.avaliacao) return res.send([]);
  res.send([{
    nome: req.user.nome,
    email: req.user.email,
    token: req.user.token,
    createdAt: req.user.createdAt,
    ano: new Date(req.user.createdAt).getFullYear()
  }]);
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
