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

router.all('/*', ensureAuthenticated, miPermiso("1"));

router.get('/loggedin', ensureAuthenticated, (req, res, next) => {
  res.send(req.user);
});

router.get('/upload', function(req, res, next) { res.render('view-teste.ejs') });

router.post('/upload', function(req, res){
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {
    res.writeHead(200, {'content-type': 'text/plain'});
    res.write('received upload:\n\n');

    var image = files.file
    , image_upload_path_old = image.path
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
  let newProject = req.body;
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

/*router.put('/updateOrientador', (req, res) => {
let id = req.user.id;

if(req.body.nomeOrientador1 !== undefined && req.body.emailOrientador1 !== undefined && req.body.cpfOrientador1 !== undefined && req.body.telefoneOrientador1 !== undefined && req.body.tamCamisetaOrientador1 !== undefined){
let id_subdoc_1 = req.body.idOrientador1;
let newIntegrante = ({
tipo: "Orientador",
nome: req.body.nomeOrientador1,
email: req.body.emailOrientador1,
cpf: splita(req.body.cpfOrientador1),
telefone: splita(req.body.telefoneOrientador1),
tamCamiseta: req.body.tamCamisetaOrientador1,
_id: id_subdoc_1
});

ProjetoSchema.findOneAndUpdate({"_id": id,"integrantes._id": id_subdoc_1},
{"$set": {"integrantes.$": newIntegrante, updatedAt: Date.now()}}, {new:true},
(err,doc) => {
if (err) throw err;
res.status(200).send('OK');
}
);
} else if (req.body.nomeOrientador1 == undefined && req.body.emailOrientador1 == undefined && req.body.idOrientador1 !== undefined) {
ProjetoSchema.findOne({"_id": id,"integrantes._id": req.body.idOrientador1}, (err, usr) => {
if (err) throw err;
usr.integrantes.id(req.body.idOrientador1).remove();
usr.save((err, usr) => {
if (err) throw err;
res.status(200).send('OK');
});
});
} else res.status(200).send('ultima af coisa deu');

if (req.body.nomeOrientador2 !== undefined && req.body.emailOrientador2 !== undefined && req.body.cpfOrientador2 !== undefined && req.body.telefoneOrientador2 !== undefined && req.body.tamCamisetaOrientador2 !== undefined){
let id_subdoc_2 = req.body.idOrientador2;
let newIntegrante2 = ({
tipo: "Orientador",
nome: req.body.nomeOrientador2,
email: req.body.emailOrientador2,
cpf: splita(req.body.cpfOrientador2),
telefone: splita(req.body.telefoneOrientador2),
tamCamiseta: req.body.tamCamisetaOrientador2,
_id: id_subdoc_2
});

ProjetoSchema.findOneAndUpdate({"_id": id,"integrantes._id": id_subdoc_2},
{"$set": {"integrantes.$": newIntegrante2, updatedAt: Date.now()}}, {new:true},
(err,doc) => {
if (err) throw err;
res.status(200).send('OK');
}
);
} else if (req.body.nomeOrientador2 == undefined && req.body.emailOrientador2 == undefined && req.body.idOrientador2 !== undefined) {
ProjetoSchema.findOne({"_id": id,"integrantes._id": req.body.idOrientador2}, (err, usr) => {
if (err) throw err;
usr.integrantes.id(req.body.idOrientador2).remove();
usr.save((err, usr) => {
if (err) throw err;
res.status(200).send('OK');;
});
});
} else res.status(200).send('ultima af coisa deu');
});

router.put('/novoIntegrante', (req, res) => {

let newIntegrante = ({
tipo: req.body.tipo,
nome: req.body.nome,
email: req.body.email,
cpf: splita(req.body.cpf),
telefone: splita(req.body.telefone),
tamCamiseta: req.body.tamCamiseta
});

ProjetoSchema.findOne({_id: req.user.id}, (err, usr) => {
if (err) throw err;
usr.integrantes.push(newIntegrante);
usr.save((err, usr) => {
if (err) throw err;
});
});


ProjetoSchema.update({_id:req.user.id}, {$set: {updatedAt: Date.now()}}, {upsert:true,new: true}, (err,docs) => {
if (err) throw err;
res.status(200).json(docs);
});

});*/

router.put('/removerIntegrante', (req, res) => {
  try {
    let id = req.body.integrantes_id;

    ProjetoSchema.findOne({"integrantes._id": id}, (err, usr) => {
      if (err) throw new Error('Erro ao remover integrante'); // Alteração Lucas Ferreira
      usr.integrantes.id(id).remove()
      usr.save((err, usr) => {
        if (err) throw err;
      });
    });

    ProjetoSchema.update({_id:req.user.id}, {$set: {updatedAt: Date.now()}}, {upsert:true,new: true}, (err,docs) => {
      if (err) throw new Error('Erro ao remover integrante'); // Alteração Lucas Ferreira
      res.status(200).json(docs);
    });
  } catch (error) {
    console.log("ProjetoSchema.finOne: " + err); // Alteração Lucas Ferreira
  }
});

// router.post('/redefinir-senha', (req, res) => {
//   let username = req.body.username;
//   console.log(username);
//   crypto.randomBytes(20, (err, buf) => {
//     let token = buf.toString('hex');

//     ProjetoSchema.findOneAndUpdate({username: username}, {$set:{resetPasswordToken:token, resetPasswordCreatedDate:Date.now() + 3600000}}, {upsert:true, new: true}, function(err, doc){
//       if(err){
//         console.log("Something wrong when updating data!");
//       } else{
//         let email = doc.email;
//         let nome_projeto = doc.nomeProjeto;
//         // let url = "http://www.movaci.com.br/nova-senha/"+token;
//         let url = "http://www.movaci.com.br/nova-senha/"+username+"/"+token;

//         res.sendStatus(200);
//         res.send(url);

//         var templatesDir = path.resolve(__dirname, '..', 'templates')
//         var template = new EmailTemplate(path.join(templatesDir, 'redefinicao'))
//         // Prepare nodemailer transport object
//         const transport = nodemailer.createTransport(smtpTransport({
//           host: 'smtp.zoho.com',
//           port: 587,
//           auth: {
//             user: "contato@movaci.com.br",
//             pass: "*mo12va45ci78!"
//           }
//         }));

//         var locals = {
//           email: email,
//           projeto: nome_projeto,
//           url: url,
//         }

//         template.render(locals, function (err, results) {
//           if (err) {
//             return console.error(err)
//           }

//           transport.sendMail({
//             from: 'MOVACI <contato@movaci.com.br>',
//             to: locals.email,
//             subject: 'MOVACI - Redefinição de senha',
//             html: results.html,
//             text: results.text
//           }, function (err, responseStatus) {
//             if (err) {
//               return console.error(err)
//             }
//             console.log(responseStatus.message)
//           })
//         });
//       }
//     });
//   });
// });

// router.post('/nova-senha/:token', (req, res) => {
//   if(req.params.token === '') {
//     res.status(400).send("erro");
//     console.log('err');
//   } else {
//     ProjetoSchema.findOne({resetPasswordToken: (req.params.token)}, (err, usr) => {
//       if(err || !usr) {
//         res.status(400).send("erro2");
//       } else if(usr.resetPasswordToken == req.params.token && !usr.hasExpired()) {
//         usr.resetPasswordToken = undefined;
//         usr.resetPasswordCreatedDate = undefined;
//         let password = req.body.password;

//         bcrypt.genSalt(10, (err, salt) => {
//           bcrypt.hash(password, salt, (err, hash) => {
//             usr.password = hash;
//             usr.save((err, usr) => {
//               if(err) throw err;
//               console.log(usr);
//               res.status(200).send('Senha alterada');
//             });
//           });
//         });
//       } else {
//         res.status(400).send("erro3");
//       }
//     });
//   };
// });

// router.post('/contato', (req, res) => {
//   let email = req.body.email
//   ,   nome = req.body.nome
//   ,   assunto = req.body.assunto
//   ,   mensagem = req.body.mensagem;

//   const transporter = nodemailer.createTransport(smtpTransport({
//     host: 'smtp.zoho.com',
//     port: 587,
//     auth: {
//       user: "contato@movaci.com.br",
//       pass: "*mo12va45ci78!"
//     }
//   }));

//   var mailOptions = {
//     from: 'contato@movaci.com.br',
//     to: 'contato@movaci.com.br',
//     subject: assunto,
//     text: '',
//     html: '<b> Contato via site:</b><br><b>De: </b>'+nome+' '+email+'<br><b>Assunto: </b>'+assunto+'<br><b>Mensagem: </b>'+mensagem
//   };

//   transporter.sendMail(mailOptions, function(error, info){
//     if(error){
//       return console.log(error);
//     } else {
//       res.send('success');
//     }
//     console.log('Message sent: ' + info.response);
//   });
// });

module.exports = router;
