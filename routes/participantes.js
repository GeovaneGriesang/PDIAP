'use strict';

const express = require('express')
, nodemailer = require('nodemailer')
, EmailTemplate = require('email-templates').EmailTemplate
, path = require('path')
, router = express.Router()
, crypto = require('crypto')
, bcrypt = require('bcryptjs')
, mongoose = require('mongoose')
, Participante = require('../controllers/participante-controller')
, ParticipanteSchema = require('../models/participante-schema');

// Garante que quem está autenticado é mesmo um Participante (não Projeto/Admin/Avaliador) -
// login único acontece em routes/index.js (strategy 'unico'), aqui só protege as rotas do
// dashboard próprio do participante.
function ensureParticipante(req, res, next) {
  if (req.isAuthenticated() && req.user.constructor.modelName === 'Participante') {
    return next();
  }
  res.sendStatus(403);
}

router.get('/dashboard/loggedin', ensureParticipante, (req, res) => {
  res.send({
    nome: req.user.nome,
    email: req.user.email,
    senhaDefinida: !!req.user.senhaDefinida
  });
});

// Troca de senha - funciona tanto pro primeiro acesso (senhaDefinida false, não exige
// senhaAtual - a "senha" usada pra logar nesse caso foi o documento) quanto pra troca
// voluntária estando logado (senhaDefinida true, exige senhaAtual correta). Mesmo padrão
// de routes/avaliadores.js#trocar-senha.
router.post('/dashboard/trocar-senha', ensureParticipante, (req, res) => {
  let novaSenha = req.body.novaSenha;
  if (!Participante.senhaForte(novaSenha)) {
    return res.status(400).send('A senha precisa ter de 8 a 12 caracteres, com maiúscula, minúscula, número e símbolo.');
  }

  ParticipanteSchema.findById(req.user._id, (err, participante) => {
    if (err) { console.error('Erro ao trocar senha de participante', err); return res.status(500).send('Erro ao trocar senha.'); }
    if (!participante) return res.status(404).send('Participante não encontrado.');

    let prosseguir = () => {
      bcrypt.genSalt(10, (err, salt) => {
        if (err) { console.error(err); return res.status(500).send('Erro ao trocar senha.'); }
        bcrypt.hash(novaSenha, salt, (err, hash) => {
          if (err) { console.error(err); return res.status(500).send('Erro ao trocar senha.'); }
          participante.password = hash;
          participante.senhaDefinida = true;
          participante.save((err) => {
            if (err) { console.error(err); return res.status(500).send('Erro ao trocar senha.'); }
            res.send('success');
          });
        });
      });
    };

    if (participante.senhaDefinida) {
      if (!req.body.senhaAtual) return res.status(400).send('Informe a senha atual.');
      bcrypt.compare(req.body.senhaAtual, participante.password, (err, isMatch) => {
        if (err) { console.error(err); return res.status(500).send('Erro ao trocar senha.'); }
        if (!isMatch) return res.status(400).send('Senha atual incorreta.');
        prosseguir();
      });
    } else {
      prosseguir();
    }
  });
});

// Recuperação de senha (esqueci a senha) - mesmo padrão de routes/avaliadores.js: token
// aleatório com expiração de 1h, enviado por e-mail.
router.post('/dashboard/redefinir-senha', (req, res) => {
  let email = req.body.email;
  ParticipanteSchema.findOne({ email: email }, (err, participante) => {
    if (err) { console.error('Erro ao redefinir senha de participante', err); return; }
    if (!participante) return res.status(404).send('E-mail não encontrado.');

    let token = crypto.randomBytes(20).toString('hex');
    ParticipanteSchema.findOneAndUpdate(
      { email: email },
      { $set: { resetPasswordToken: token, resetPasswordCreatedDate: Date.now() + 3600000 } },
      (err) => {
        if (err) { console.error(err); return; }
      }
    );

    res.send(email);

    var templatesDir = path.resolve(__dirname, '..', 'templates');
    var template = new EmailTemplate(path.join(templatesDir, 'redefinicao-participante'));
    const transport = nodemailer.createTransport({
      host: 'smtp.gmail.com', port: 587,
      auth: { user: process.env.SMTP_GMAIL_USER, pass: process.env.SMTP_GMAIL_PASS }
    });
    var locals = { email: email, nome: participante.nome, url: "http://www.movaci.com.br/participantes/dashboard/nova-senha/" + token };
    template.render(locals, function (err, results) {
      if (err) { console.error(err); return; }
      transport.sendMail({
        from: 'MOVACI <va-movaci@ifsul.edu.br>',
        to: email,
        subject: 'MOVACI - Redefinição de senha (participante)',
        html: results.html,
        text: results.text
      }, function (err) {
        if (err) { console.error(err); return; }
      });
    });
  });
});

router.post('/dashboard/nova-senha/:token', (req, res) => {
  ParticipanteSchema.findOne({ resetPasswordToken: req.params.token }, (err, participante) => {
    if (err) { console.error('Erro ao definir nova senha de participante', err); return res.send('erro'); }
    if (!participante) return res.send('erro2');
    if (participante.hasExpired()) return res.send('erro3');
    if (!Participante.senhaForte(req.body.password)) {
      return res.status(400).send('A senha precisa ter de 8 a 12 caracteres, com maiúscula, minúscula, número e símbolo.');
    }

    bcrypt.genSalt(10, (err, salt) => {
      if (err) { console.error(err); return res.send('erro'); }
      bcrypt.hash(req.body.password, salt, (err, hash) => {
        if (err) { console.error(err); return res.send('erro'); }
        participante.password = hash;
        participante.senhaDefinida = true;
        participante.resetPasswordToken = undefined;
        participante.resetPasswordCreatedDate = undefined;
        participante.save((err) => {
          if (err) { console.error(err); return res.send('erro'); }
          res.send('Senha alterada');
        });
      });
    });
  });
});

// Soma duas cargas horárias no formato "H:MM" (mesma lógica de
// public/assets/js/controllers/homeCtrl.js#somaHora, portada pro servidor).
function somaHora(horaInicio, horaSomada) {
  let horaIni = horaInicio.split(':');
  let horaSom = horaSomada.split(':');
  let horasTotal = parseInt(horaIni[0], 10) + parseInt(horaSom[0], 10);
  let minutosTotal = parseInt(horaIni[1], 10) + parseInt(horaSom[1], 10);
  if (minutosTotal >= 60) {
    minutosTotal -= 60;
    horasTotal += 1;
  }
  let minutosStr = minutosTotal.toString();
  if (minutosStr.length === 1) minutosStr = '0' + minutosStr;
  return horasTotal + ':' + minutosStr;
}

// Certificados disponíveis - participante pode ter dois tipos independentes (Oficina e
// Seminário Saberes Docentes), cada um com seu próprio token e agregando todos os eventos
// daquele tipo (soma de carga horária, títulos concatenados). Mesma lógica hoje espalhada
// em routes/index.js (geração de token) e homeCtrl.js#buscarCPF (agregação), portada aqui
// de um jeito só, aguardando a gravação do token antes de responder (o fluxo antigo de
// busca por CPF tem uma corrida onde a resposta às vezes sai com o token ainda vazio -
// não reaproveitamos esse caminho pra não herdar o bug).
router.get('/dashboard/meus-certificados', ensureParticipante, (req, res) => {
  let eventos = req.user.eventos || [];
  let temOficina = eventos.some((e) => e.tipo === 'Oficina');
  let temSaberes = eventos.some((e) => e.tipo === 'Seminário Saberes Docentes');

  let garantirTokens = (callback) => {
    let campos = {};
    if (temOficina && !req.user.tokenOficinas) campos.tokenOficinas = new mongoose.Types.ObjectId();
    if (temSaberes && !req.user.tokenSaberes) campos.tokenSaberes = new mongoose.Types.ObjectId();
    if (Object.keys(campos).length === 0) return callback(null, req.user);
    ParticipanteSchema.findByIdAndUpdate(req.user._id, { $set: campos }, { new: true }, callback);
  };

  garantirTokens((err, participante) => {
    if (err) { console.error('Erro ao gerar token de certificado do participante', err); return res.status(500).send('Erro ao carregar certificados.'); }

    let ano = new Date(participante.createdAt).getFullYear();
    let resposta = { oficina: null, saberes: null };

    if (temOficina) {
      let titulos = '';
      let cargaHoraria = '0:00';
      eventos.forEach((e) => {
        if (e.tipo !== 'Oficina') return;
        titulos = titulos === '' ? e.titulo : titulos + ', ' + e.titulo;
        cargaHoraria = somaHora(e.cargaHoraria, cargaHoraria);
      });
      resposta.oficina = { nome: participante.nome, token: participante.tokenOficinas, eventos: titulos, cargaHoraria: cargaHoraria, ano: ano };
    }

    if (temSaberes) {
      let eventosTexto = '';
      let cargaHoraria = '0:00';
      eventos.forEach((e) => {
        if (e.tipo !== 'Seminário Saberes Docentes') return;
        eventosTexto += e.titulo + ': ' + e.cargaHoraria + ' hora (s).\n';
        cargaHoraria = somaHora(e.cargaHoraria, cargaHoraria);
      });
      resposta.saberes = { nome: participante.nome, token: participante.tokenSaberes, eventos: eventosTexto, cargaHoraria: cargaHoraria, ano: ano };
    }

    res.send(resposta);
  });
});

module.exports = router;
