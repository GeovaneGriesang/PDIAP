'use strict';

const express = require('express')
, router = express.Router()
, passport = require('passport')
, LocalStrategy = require('passport-local').Strategy
, Projeto = require('../controllers/projeto-controller')
, session = require('express-session')
, ProjetoSchema = require('../models/projeto-schema')
, crypto = require('crypto')
, bcrypt = require('bcryptjs')
, Admin = require('../controllers/admin-controller')
, adminSchema = require('../models/admin-schema')
, path = require('path')
, formidable = require('formidable')
, fs = require('fs')
, async = require('async')
, documentoValidator = require('../utils/documentoValidator');

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated())
  return next();
  else{
    res.send(403);
  }
}

function miPermiso(role) {
  return function(req, res, next) {
    if(req.user.permissao === role)
      next();
    else res.send(403);
  }
}

function splita(arg){
  if (arg !== undefined) {
    let data = arg.replace(/([-.() ])/g,'');
    return data;
  }
}

// Campos que o próprio projeto pode alterar via PUT /update (ver formulário em public/views/update.html).
// Qualquer outro campo do body (ex: permissao, password, aprovado, premiacao, token) é ignorado
// para impedir que o usuário se autopromova ou altere dados fora do seu controle. escola/nomeEscola
// aqui é só o vínculo com a coleção Escola (seleção da lista) - não dá pra virar outros campos.
const CAMPOS_EDITAVEIS_PROJETO = ['nomeProjeto', 'categoria', 'eixo', 'participa', 'resumo', 'palavraChave', 'estado', 'cidade', 'cep', 'hospedagem', 'escola', 'nomeEscola'];

function filtrarCamposEditaveis(body) {
  let filtrado = {};
  CAMPOS_EDITAVEIS_PROJETO.forEach((campo) => {
    if (body[campo] !== undefined) filtrado[campo] = body[campo];
  });
  return filtrado;
}

function idValido(id) {
  return typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
}

// Só o projeto da edição atual pode ser autoeditado (projeto em si ou seus
// integrantes) - checagem por ANO DO PROJETO (createdAt) contra o "ano" da edição
// atual configurado em Editar > Tela inicial, não pelo ano civil (pode não bater com
// o ano da edição em andamento). Usado por /update e /upgreice.
async function bloqueadoPorEdicaoAnterior(projetoId) {
  if (!idValido(projetoId)) return true;
  let projeto = await ProjetoSchema.findById(projetoId, 'createdAt');
  if (!projeto) return true;
  let admin = await adminSchema.findOne({ username: 'admin2' }, 'ano');
  let anoProjeto = new Date(projeto.createdAt).getFullYear();
  // Bug real encontrado e corrigido ao testar esta migração (impacto grave: bloqueava
  // TODA edição de projeto/integrantes em produção, de qualquer ano): admin2.ano é
  // gravado hoje como texto livre (ex: "de 2026", em vez do número 2026 - ver
  // routes/admin.js, rota que salva 'ano' sem normalizar o valor recebido do formulário),
  // então a comparação Number !== String sempre dava true. Extrai os 4 dígitos do ano
  // de qualquer jeito que esteja gravado, número limpo ou texto solto, pra comparação
  // funcionar nos dois casos.
  let anoAdminMatch = admin && admin.ano != null && String(admin.ano).match(/\d{4}/);
  let anoAdmin = anoAdminMatch ? parseInt(anoAdminMatch[0], 10) : null;
  return !!(anoAdmin && anoProjeto !== anoAdmin);
}

router.all('/*', ensureAuthenticated, miPermiso("1"));

router.get('/loggedin', ensureAuthenticated, (req, res, next) => {
  res.send(req.user);
});

router.get('/upload', function(req, res, next) { res.render('view-teste.ejs') });

router.post('/upload', function(req, res){
  var form = new formidable.IncomingForm();
  // Limite de tamanho e validação de tipo: antes aceitava qualquer arquivo, de
  // qualquer tamanho, e só forçava a extensão ".pdf" no nome ao salvar — o
  // conteúdo em si nunca era conferido.
  form.maxFileSize = 10 * 1024 * 1024; // 10MB
  form.parse(req, async function(err, fields, files) {
    // A partir do formidable 3.x, files.file é um array (mesmo com um só arquivo
    // enviado) - antes era o objeto do arquivo direto.
    var image = files.file && files.file[0];

    if (err || !image) {
      res.writeHead(400, {'content-type': 'text/plain'});
      return res.end('Falha no upload (arquivo ausente ou maior que 10MB).');
    }

    // Nomes de propriedade mudaram no formidable 3.x: name→originalFilename,
    // type→mimetype, path→filepath.
    var nomeOriginal = (image.originalFilename || '').toLowerCase();
    var mimetype = image.mimetype || '';
    var extensaoValida = nomeOriginal.endsWith('.pdf');
    var mimetypeValido = mimetype === 'application/pdf';

    // Confere a "assinatura" do arquivo (primeiros bytes = %PDF-), já que nome e
    // mimetype enviados pelo navegador podem ser forjados pelo próprio usuário.
    var assinaturaValida = false;
    try {
      var fd = fs.openSync(image.filepath, 'r');
      var buffer = Buffer.alloc(5);
      fs.readSync(fd, buffer, 0, 5, 0);
      fs.closeSync(fd);
      assinaturaValida = buffer.toString('ascii') === '%PDF-';
    } catch (e) {}

    if (!extensaoValida || !mimetypeValido || !assinaturaValida) {
      fs.unlink(image.filepath, function () {});
      res.writeHead(400, {'content-type': 'text/plain'});
      return res.end('Arquivo inválido: envie um PDF de até 10MB.');
    }

    res.writeHead(200, {'content-type': 'text/plain'});
    res.write('received upload:\n\n');

    // Pasta era fixa em "relatorios_2018" (numInscricao é global e auto-incrementado, nunca
    // reinicia por ano - então nunca colidiu entre edições, só ficava com nome enganoso).
    var image_upload_path_old = image.filepath
    , image_upload_path_new = '../PDIAP/public/relatorios/'
    , image_upload_name = req.user.numInscricao+'.pdf'
    , image_upload_path_name = image_upload_path_new + image_upload_name;

    if (fs.existsSync(image_upload_path_new)) {
      fs.rename(image_upload_path_old, image_upload_path_name, function (err) {
        if (err) {
          console.log('Err: ', err);
          res.end('Deu problema na hora de mover a imagem');
        }

        var msg = 'Relatório ' + image_upload_name + ' salv0 em: ' + image_upload_path_new;
        console.log(msg);
        res.end(msg);
      });
    } else {
      fs.mkdir(image_upload_path_new, function (err) {
      if (err) {
        console.log('Err: ', err);
        res.end('Deu merda na hora de criar o diretório!');
      }
      fs.rename(image_upload_path_old, image_upload_path_name, function(err) {
        var msg = 'Relatório ' + image_upload_name + ' salv0 em: ' + image_upload_path_new;
        console.log(msg);
        res.end(msg);
      });
    });
  }

  let dadosRelatorio = {
    name: image.originalFilename,
    size: image.size,
    uploadAt: image.mtime
  };

  try {
    let usr = await ProjetoSchema.findOne({'_id': req.user.id});
    usr.relatorio2 = dadosRelatorio;
    await usr.save();
  } catch (err) {
    console.error(err);
  }
  });
});

router.post('/confirma/:id/:situacao', async (req, res) => {
  if (req.params.id === '') return;
  try {
    let usr = await ProjetoSchema.findOne({'_id': req.params.id});
    if (usr.aprovado === true && usr.participa_updated === undefined) {
      if (req.params.situacao === '2456') {
        // Bug pré-existente encontrado ao testar esta migração (não é regressão daqui):
        // .update() nunca devolve o documento, mesmo com {new:true} - isso só funciona em
        // findOneAndUpdate(). res.send(docs.nomeProjeto) sempre mandou undefined. Corrigido
        // trocando pro método que de fato devolve o documento, que é claramente a intenção
        // original (usar {new:true} só faz sentido se for usar o documento retornado).
        let docs = await ProjetoSchema.findOneAndUpdate({'_id': req.params.id}, {$set:{'participa':true, 'participa_updated':true}}, {upsert:true, new: true});
        return res.send(docs.nomeProjeto);
      }

      if (req.params.situacao === '9877') { //------------------------------------------------------------------9877 cod não participa
        let docs = await ProjetoSchema.findOneAndUpdate({'_id': req.params.id}, {$set:{'participa':false, 'participa_updated':true}}, {upsert:true, new: true});
        return res.send(docs.nomeProjeto);
      }
    } else {
      res.sendStatus(401);
    }
  } catch (err) {
    console.log("Something wrong when updating data!");
  }
});

router.get('/', (req, res, next) => {
  // res.send('Projetos po');
});

router.get('/update', (req, res) => {
  res.send('Página de update');
});

// Os campos "editáveis" ligados em Editar > Campos editáveis (routes/admin.js
// /setOpcoes) valem só enquanto o projeto é da edição corrente - de um ano pra outro
// os dados viram histórico e não devem mudar mais (ver bloqueadoPorEdicaoAnterior).
router.put('/update', async (req, res) => {
  let bloqueado;
  try {
    bloqueado = await bloqueadoPorEdicaoAnterior(req.user.id);
  } catch (err) {
    console.error(err);
    return res.status(500).send('Erro ao checar edição atual');
  }
  if (bloqueado) return res.status(403).send('Este projeto é de uma edição anterior e não pode mais ser editado.');

  if (req.body.cep !== undefined){
    req.body.cep = splita(req.body.cep);
  }
  let newProject = filtrarCamposEditaveis(req.body);
  console.log(newProject);

  try {
    // Mesmo bug/fix de POST /confirma: .update() não devolve documento mesmo com
    // {new:true} - virou findOneAndUpdate() pra res.json(docs) mandar o projeto de
    // verdade (antes sempre mandava só {n, nModified, ok}).
    let docs = await ProjetoSchema.findOneAndUpdate({_id:req.user.id}, {$set:newProject, updatedAt: Date.now()}, {upsert:true, new: true});
    res.status(200).json(docs);
  } catch (err) {
    console.error(err);
  }
});

router.put('/upgreice', async (req, res) => {

  let myArray = req.body
  ,   id = req.user.id;
  console.log("TESTE:"+JSON.stringify(myArray));

  let bloqueado;
  try {
    bloqueado = await bloqueadoPorEdicaoAnterior(id);
  } catch (err) {
    console.error(err);
    return res.status(500).send('Erro ao checar edição atual');
  }
  if (bloqueado) return res.status(403).send('Este projeto é de uma edição anterior e não pode mais ser editado.');

  for (let j = 0; j < myArray.length; j++) {
    let v = myArray[j];
    if (v.cpf !== undefined) {
      let checagemDoc = documentoValidator.validarDocumento(v.cpf);
      if (!checagemDoc.valido) return res.status(400).send(checagemDoc.mensagem);
    }
    if (v.telefone !== undefined) {
      let checagemTelefone = documentoValidator.validarTelefone(v.telefone);
      if (!checagemTelefone.valido) return res.status(400).send(checagemTelefone.mensagem);
    }
  }

  myArray.forEach(function (value, i) {
    //console.log('%d: %s', i);

    if (value._id !== undefined) {
      if (!idValido(value._id)) return;
      let id_subdoc = value._id
      ,   newIntegrante = ({
        _id: id_subdoc,
        tipo: value.tipo,
        nome: value.nome,
        email: value.email,
        nacionalidade: value.nacionalidade,
        cpf: splita(value.cpf),
        telefone: splita(value.telefone),
        tamCamiseta: value.tamCamiseta
      });
      ProjetoSchema.findOneAndUpdate({"_id": id,"integrantes._id": id_subdoc},
        {"$set": {"integrantes.$": newIntegrante, updatedAt: Date.now()}}, {new:true})
        .catch((err) => console.error(err));
    } else {
      let newIntegrante = ({
        tipo: value.tipo,
        nome: value.nome,
        email: value.email,
        nacionalidade: value.nacionalidade,
        cpf: splita(value.cpf),
        telefone: splita(value.telefone),
        tamCamiseta: value.tamCamiseta
      });

      // Bug real encontrado e corrigido ao testar esta migração (impacto grave: era
      // impossível adicionar um integrante novo a um projeto, só editar um que já tinha
      // _id): o Mongoose 4 gera um modificador $pushAll pra "usr.integrantes.push(...) +
      // usr.save()", removido pelo MongoDB desde a versão 3.6 - a operação sempre falhava
      // silenciosamente (erro só ia pro console.error). $push nativo via updateOne() é
      // atômico e não passa pelo diff do Mongoose, então não tem esse problema - também
      // junta em uma única operação o que antes eram duas chamadas separadas (push+save
      // e o updateOne de updatedAt).
      ProjetoSchema.updateOne({_id: id}, {$push: {integrantes: newIntegrante}, $set: {updatedAt: Date.now()}})
        .catch((err) => console.error(err));
    }
  });
  res.redirect('/home/update');
});


module.exports = router;
