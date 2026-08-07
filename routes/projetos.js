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
, nodemailer = require('nodemailer')
, adminSchema = require('../models/admin-schema')
, smtpTransport = require('nodemailer-smtp-transport')
, path = require('path')
, EmailTemplate = require('email-templates').EmailTemplate
, wellknown = require('nodemailer-wellknown')
, formidable = require('formidable')
, fs = require('fs')
, async = require('async');

function testaEmail(req, res) {
  ProjetoSchema.find('email','email -_id', (error, emails) => {
    if(error) {
      return res.status(400).send({msg:"error occurred"});
    } else
    return res.status(200).send(emails);
  });
}

function testaEmailEEscola(req, res) {
  ProjetoSchema.find('email nomeEscola','email nomeEscola -_id', (error, escolas) => {
    if(error) {
      return res.status(400).send({msg:"error occurred"});
    } else
    return res.status(200).send(escolas);
  });
}

function testaEmail2(req, res, next) {
  let query2 = req.body.email
  ,   query = new RegExp(["^", query2, "$"].join(""), "i");

  ProjetoSchema.find({'email':query},'email -_id', (error, emails) => {
    if(error) {
      return res.status(400).send({msg:"error occurred"});
    } else if(emails != 0) {
      res.status(202).send("Email já cadastrado");
    } else {
      res.status(200).send("show");
      return next();
    }
  });
}

function testaUsernameEEscola(req, res) {
  ProjetoSchema.find('username nomeEscola','username nomeEscola -_id', (error, escolas) => {
    if(error) {
      return res.status(400).send({msg:"error occurred"});
    } else
    return res.status(200).send(escolas);
  });
}

function testaUsername2(req, res, next) {
  let query2 = req.body.email
  ,   query = new RegExp(["^", query2, "$"].join(""), "i");

  ProjetoSchema.find({'username':query},'username -_id', (error, usernames) => {
    if(error) {
      return res.status(400).send({msg:"error occurred"});
    } else if(usernames != 0) {
      res.status(202).send("Username já cadastrado");
    } else {
      res.status(200).send("show");
      return next();
    }
  });
}

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
// para impedir que o usuário se autopromova ou altere dados fora do seu controle.
const CAMPOS_EDITAVEIS_PROJETO = ['nomeProjeto', 'categoria', 'eixo', 'participa', 'resumo', 'palavraChave', 'estado', 'cidade', 'cep', 'hospedagem'];

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
  form.parse(req, function(err, fields, files) {
    var image = files.file;

    if (err || !image) {
      res.writeHead(400, {'content-type': 'text/plain'});
      return res.end('Falha no upload (arquivo ausente ou maior que 10MB).');
    }

    var nomeOriginal = (image.name || '').toLowerCase();
    var mimetype = image.type || '';
    var extensaoValida = nomeOriginal.endsWith('.pdf');
    var mimetypeValido = mimetype === 'application/pdf';

    // Confere a "assinatura" do arquivo (primeiros bytes = %PDF-), já que nome e
    // mimetype enviados pelo navegador podem ser forjados pelo próprio usuário.
    var assinaturaValida = false;
    try {
      var fd = fs.openSync(image.path, 'r');
      var buffer = Buffer.alloc(5);
      fs.readSync(fd, buffer, 0, 5, 0);
      fs.closeSync(fd);
      assinaturaValida = buffer.toString('ascii') === '%PDF-';
    } catch (e) {}

    if (!extensaoValida || !mimetypeValido || !assinaturaValida) {
      fs.unlink(image.path, function () {});
      res.writeHead(400, {'content-type': 'text/plain'});
      return res.end('Arquivo inválido: envie um PDF de até 10MB.');
    }

    res.writeHead(200, {'content-type': 'text/plain'});
    res.write('received upload:\n\n');

    var image_upload_path_old = image.path
    , image_upload_path_new = '../PDIAP/public/relatorios_2018/'
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
    name: files.file.name,
    size: files.file.size,
    uploadAt: files.file.lastModifiedDate
  };

  if (err) throw err;
  ProjetoSchema.findOne({'_id': req.user.id}, (err, usr) => {
    usr.relatorio2 = dadosRelatorio;
    usr.save((err, usr) => {
      if (err) throw err;
    });
  });
  });
});

router.post('/confirma/:id/:situacao', (req, res) => {
  if(req.params.id !== '') {
    ProjetoSchema.findOne({'_id': req.params.id}, (err, usr) => {
    if(err){
      console.log("Something wrong when updating data!");
    } else {
      if (usr.aprovado === true && usr.participa_updated === undefined) {
        if(req.params.situacao === '2456') {
          ProjetoSchema.update({'_id': req.params.id}, {$set:{'participa':true, 'participa_updated':true}}, {upsert:true,new: true}, (err,docs) => {
            if (err) throw err;
            res.send(docs.nomeProjeto);
          });
        }

        if(req.params.situacao === '9877') { //------------------------------------------------------------------9877 cod não participa
          ProjetoSchema.update({'_id': req.params.id}, {$set:{'participa':false, 'participa_updated':true}}, {upsert:true,new: true}, (err,docs) => {
            if (err) throw err;
            res.send(docs.nomeProjeto);
          });
        }
      } else
      res.sendStatus(401);
    }})
  }
});

router.get('/', (req, res, next) => {
  // res.send('Projetos po');
});

router.get('/update', (req, res) => {
  res.send('Página de update');
});

router.put('/update', (req, res) => {
  if (req.body.cep !== undefined){
    req.body.cep = splita(req.body.cep);
  }
  let newProject = filtrarCamposEditaveis(req.body);
  console.log(newProject);

  ProjetoSchema.update({_id:req.user.id}, {$set:newProject, updatedAt: Date.now()}, {upsert:true,new: true}, (err,docs) => {
    if (err) throw err;
    res.status(200).json(docs);
  });
});

router.put('/upgreice', (req, res) => {

  let myArray = req.body
  ,   id = req.user.id;
  console.log("TESTE:"+JSON.stringify(myArray));
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
        cpf: splita(value.cpf),
        telefone: splita(value.telefone),
        tamCamiseta: value.tamCamiseta
      });
      ProjetoSchema.findOneAndUpdate({"_id": id,"integrantes._id": id_subdoc},
      {"$set": {"integrantes.$": newIntegrante, updatedAt: Date.now()}}, {new:true},
      (err, doc) => {
        if (err) throw err;
      }
    );	
  } else if (value._id === undefined) {
    let newIntegrante = ({
      tipo: value.tipo,
      nome: value.nome,
      email: value.email,
      cpf: splita(value.cpf),
      telefone: splita(value.telefone),
      tamCamiseta: value.tamCamiseta
    });

    ProjetoSchema.findOne({_id: id}, (err, usr) => {
      if (err) throw err;
      usr.integrantes.push(newIntegrante);
      usr.save((err, usr) => {
        if (err) throw err;
      });
    });

    ProjetoSchema.update({_id: id}, {$set: {updatedAt: Date.now()}}, {upsert:true,new: true}, (err, docs) => {
      if (err) throw err;
    });
  }
  });
  res.redirect('/home/update');
});


module.exports = router;
