'use strict';

const express = require('express')
, nodemailer = require('nodemailer')
, EmailTemplate = require('../utils/emailTemplate').EmailTemplate
, path = require('path')
, router = express.Router()
, crypto = require('crypto')
, bcrypt = require('bcryptjs')
, mongoose = require('mongoose')
, Participante = require('../controllers/participante-controller')
, loginBootstrap = require('../utils/loginBootstrap')
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

router.get('/dashboard/loggedin', ensureParticipante, async (req, res) => {
  try {
    let credencial = await loginBootstrap.carregarCredencial(req.user);
    res.send({
      nome: req.user.nome,
      email: req.user.email,
      senhaDefinida: !!credencial.senhaDefinida
    });
  } catch (err) {
    console.error('Erro ao carregar dados do participante logado', err);
    res.status(500).send('error');
  }
});

// Troca de senha - funciona tanto pro primeiro acesso (senhaDefinida false, não exige
// senhaAtual - a "senha" usada pra logar nesse caso foi o documento) quanto pra troca
// voluntária estando logado (senhaDefinida true, exige senhaAtual correta). Mesmo padrão
// de routes/avaliadores.js#trocar-senha.
router.post('/dashboard/trocar-senha', ensureParticipante, async (req, res) => {
  let novaSenha = req.body.novaSenha;
  if (!Participante.senhaForte(novaSenha)) {
    return res.status(400).send('A senha precisa ter de 8 a 12 caracteres, com maiúscula, minúscula, número e símbolo.');
  }

  try {
    let participante = await ParticipanteSchema.findById(req.user._id);
    if (!participante) return res.status(404).send('Participante não encontrado.');

    // Senha mora na Pessoa vinculada (compartilhada entre papéis) ou, sem vínculo, no
    // próprio participante - ver utils/loginBootstrap.js#carregarCredencial.
    let credencial = await loginBootstrap.carregarCredencial(participante);
    if (credencial.senhaDefinida) {
      if (!req.body.senhaAtual) return res.status(400).send('Informe a senha atual.');
      let isMatch = await bcrypt.compare(req.body.senhaAtual, credencial.password);
      if (!isMatch) return res.status(400).send('Senha atual incorreta.');
    }

    let salt = await bcrypt.genSalt(10);
    let hash = await bcrypt.hash(novaSenha, salt);
    credencial.password = hash;
    credencial.senhaDefinida = true;
    await credencial.save();
    res.send('success');
  } catch (err) {
    console.error('Erro ao trocar senha de participante', err);
    return res.status(500).send('Erro ao trocar senha.');
  }
});

// Recuperação de senha (esqueci a senha) - mesmo padrão de routes/avaliadores.js: token
// aleatório com expiração de 1h, enviado por e-mail.
router.post('/dashboard/redefinir-senha', async (req, res) => {
  let email = req.body.email;
  let participante;
  let token = crypto.randomBytes(20).toString('hex');
  try {
    participante = await ParticipanteSchema.findOne({ email: email });
    if (!participante) return res.status(404).send('E-mail não encontrado.');

    // Token vai pra Pessoa vinculada (o link redefine a senha única dela) ou, sem vínculo,
    // pro próprio participante.
    let credencial = await loginBootstrap.carregarCredencial(participante);
    await credencial.constructor.updateOne(
      { _id: credencial._id },
      { $set: { resetPasswordToken: token, resetPasswordCreatedDate: Date.now() + 3600000 } }
    );
  } catch (err) {
    console.error('Erro ao redefinir senha de participante', err);
    return res.status(500).send('error');
  }

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

router.post('/dashboard/nova-senha/:token', async (req, res) => {
  try {
    // Token na Pessoa (fluxo novo) ou no participante (emitido antes do login único / sem vínculo).
    let dono = await loginBootstrap.encontrarPorTokenReset(ParticipanteSchema, req.params.token);
    if (!dono) return res.send('erro2');
    if (dono.hasExpired()) return res.send('erro3');
    if (!Participante.senhaForte(req.body.password)) {
      return res.status(400).send('A senha precisa ter de 8 a 12 caracteres, com maiúscula, minúscula, número e símbolo.');
    }

    // A senha nova vai pra quem guarda a senha (a Pessoa, se o participante estiver
    // vinculado - mesmo que o token legado tenha sido gravado no participante).
    let credencial = await loginBootstrap.carregarCredencial(dono);
    let salt = await bcrypt.genSalt(10);
    let hash = await bcrypt.hash(req.body.password, salt);
    credencial.password = hash;
    credencial.senhaDefinida = true;
    credencial.resetPasswordToken = undefined;
    credencial.resetPasswordCreatedDate = undefined;
    await credencial.save();
    if (credencial !== dono) {
      dono.resetPasswordToken = undefined;
      dono.resetPasswordCreatedDate = undefined;
      await dono.save();
    }
    res.send('Senha alterada');
  } catch (err) {
    console.error('Erro ao definir nova senha de participante', err);
    return res.send('erro');
  }
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
router.get('/dashboard/meus-certificados', ensureParticipante, async (req, res) => {
  let eventos = req.user.eventos || [];
  let temOficina = eventos.some((e) => e.tipo === 'Oficina');
  let temSaberes = eventos.some((e) => e.tipo === 'Seminário Saberes Docentes');
  let temPalestra = eventos.some((e) => e.tipo === 'Palestra');

  try {
    let campos = {};
    if (temOficina && !req.user.tokenOficinas) campos.tokenOficinas = new mongoose.Types.ObjectId();
    if (temSaberes && !req.user.tokenSaberes) campos.tokenSaberes = new mongoose.Types.ObjectId();
    if (temPalestra && !req.user.tokenPalestra) campos.tokenPalestra = new mongoose.Types.ObjectId();
    let participante = Object.keys(campos).length === 0
      ? req.user
      : await ParticipanteSchema.findByIdAndUpdate(req.user._id, { $set: campos }, { returnDocument: 'after' });

    let ano = new Date(participante.createdAt).getFullYear();
    let resposta = { oficina: null, saberes: null, palestra: null };

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

    if (temPalestra) {
      let titulos = '';
      let datas = '';
      let cargaHoraria = '0:00';
      eventos.forEach((e) => {
        if (e.tipo !== 'Palestra') return;
        titulos = titulos === '' ? e.titulo : titulos + ', ' + e.titulo;
        datas = datas === '' ? (e.data || '') : datas + ', ' + (e.data || '');
        cargaHoraria = somaHora(e.cargaHoraria, cargaHoraria);
      });
      resposta.palestra = { nome: participante.nome, token: participante.tokenPalestra, eventos: titulos, titulo: titulos, data: datas, tipo: 'Palestra', cargaHoraria: cargaHoraria, ano: ano };
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
  } catch (err) {
    console.error('Erro ao gerar token de certificado do participante', err);
    return res.status(500).send('Erro ao carregar certificados.');
  }
});

module.exports = router;
