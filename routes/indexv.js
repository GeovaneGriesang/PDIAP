'use strict';

const express = require('express')
, router = express.Router()
, passport = require('passport')
, LocalStrategy = require('passport-local').Strategy
, Projeto = require('../controllers/projeto-controller')
, session = require('express-session')
, ProjetoSchema = require('../models/projeto-schema')
, avaliadorSchema = require('../models/avaliador-schema')
, participanteSchema = require('../models/participante-schema')
, eventoSchema = require('../models/evento-schema')
, premiadoSchema = require('../models/premiados2016-schema')
, crypto = require('crypto')
, bcrypt = require('bcryptjs')
, Admin = require('../controllers/admin-controller')
, nodemailer = require('nodemailer')
, adminSchema = require('../models/admin-schema')
, mongoose = require('mongoose')
, smtpTransport = require('nodemailer-smtp-transport')
, path = require('path')
, EmailTemplate = require('email-templates').EmailTemplate
, wellknown = require('nodemailer-wellknown')
, Promise = require('promise')
, async = require('async');

function splita(arg){
  if (arg !== undefined) {
    let data = arg.replace(/([-.() ])/g,'');
    return data;
  }
}

function miPermiso(role) {
  return function(req, res, next) {
    if(req.user.permissao === role)
    next();
    else res.send(403);
  }
}

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated())
  return next();
  else{
    res.send('0');
  }
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

// router.post('/registro2', (req, res) => {
//   let newAdmin = new adminSchema({
//       username: req.body.username,
//       password: req.body.password,
//       permissao: 3
//     });
//     Admin.createAdmin(newAdmin);
//     //res.redirect('/admin/login');
//   res.send('OK');
// });

router.post('/emitirCertificado', (req, res) => {
  let cpf = splita(req.body.cpf)
  let array = []

  function pesquisaProjetoAluno(cpf) {
    return new Promise(function (fulfill, reject) {
      // ProjetoSchema.find({'integrantes.cpf':cpf,'integrantes.presenca':true}, 'integrantes.$ nomeProjeto -_id',(err, usr) => {
      ProjetoSchema.find(
        {'integrantes':{$elemMatch:{'cpf':cpf,'presenca':true, 'tipo':'Aluno'}}, 'aprovado':true},
        'integrantes.$ nomeProjeto numInscricao -_id',(err, usr) => {
        if (err) return reject(err)
        if (usr == 0) return reject({err})
        fulfill(usr)
      })
    })
  }

  function pesquisaProjetoOrientador(cpf) {
    return new Promise(function (fulfill, reject) {
      // ProjetoSchema.find({'integrantes.cpf':cpf,'integrantes.presenca':true}, 'integrantes.$ nomeProjeto -_id',(err, usr) => {
      ProjetoSchema.find(
        {'integrantes':{$elemMatch:{'cpf':cpf, 'tipo':'Orientador'}}, 'aprovado':true},
        'integrantes.$ nomeProjeto numInscricao -_id',(err, usr) => {
        if (err) return reject(err)
        if (usr == 0) return reject({err})
        fulfill(usr)
        // console.log("PESQUISA PROJETO:"+usr)
      })
    })
  }

  function pesquisaAvaliador(cpf) {
    return new Promise(function (fullfill, reject) {
      avaliadorSchema.find({'cpf':cpf}, 'nome token -_id',(err, usr) => {
        if (err) return reject(err)
        if (usr.length > 0 && usr[0].token === undefined) {
          var newId = new mongoose.mongo.ObjectId()
          avaliadorSchema.update({'cpf':cpf}, {$set:{'token':newId}}, ['-_id',{new:true}], (err, usr) => {
            if (err) return reject(err)
            fullfill(usr)
          })
        } else
          fullfill(usr)
      })
      .then(usr => ({
        tipo: "Avaliador",
        nome: usr[0].nome,
        token: usr[0].token
      }))
    })
  }

  function pesquisaAvaliador2(cpf) {
    return new Promise(function (fullfill, reject) {
      avaliadorSchema.find({'cpf':cpf}, 'nome token -_id',(err, usr) => {
        if (err) return reject(err)
        fullfill(usr)
      })
    })
  }

  function pesquisaParticipante(cpf) {
    return new Promise(function (fullfill, reject) {
      participanteSchema.find({'cpf':cpf}, 'nome tokenSaberes tokenOficinas eventos -_id', (err, usr) => {
        if (err) return reject(err)
        fullfill(usr)
      })
    })
  }

  function pesquisaEvento(cpf) {
    return new Promise(function (fullfill, reject) {
      eventoSchema.find({'responsavel.cpf':cpf}, 'tipo titulo cargaHoraria data responsavel.$', (err, usr) => {
        if (err) return reject(err)
        if (usr == 0) return reject({err})
        fullfill(usr)
        console.log("EVENTO \n"+usr)
      })
    })
  }

  function inserirToken(cpf, numInscricao, tipo) {
    console.log(cpf +"      "+numInscricao+"      "+tipo)
    return new Promise(function (fulfill, reject) {
      ProjetoSchema.findOneAndUpdate({'integrantes':{$elemMatch:{'cpf':cpf}},'numInscricao':numInscricao},
        {'$set': {'integrantes.$.certificados': {tipo:tipo}}}, [{new:true}],
        (err, usr) => {
          if (err) return reject(err)
          ProjetoSchema.find({'integrantes':{$elemMatch:{'cpf':cpf}},'numInscricao':numInscricao},
          'integrantes.$ nomeProjeto', (err, usr) => {
            let array = []
            var participante = {
              tipo: usr[0].integrantes[0].tipo,
              nome: usr[0].integrantes[0].nome,
              nomeProjeto: usr[0].nomeProjeto,
              token: usr[0].integrantes[0].certificados[0].id,
              tokentipo: usr[0].integrantes[0].certificados[0].tipo
            }
            array.push(participante)
            var retorno = {
              tipo:tipo,
              integrantes:array
            }
            fulfill(retorno)
          })
        })
    })
  }

  function inserirTokenEvento(cpf, id, tipo) {
    console.log("aaaaaaaaaa");
    console.log(cpf +"      "+id+"      "+tipo)
    return new Promise(function (fulfill, reject) {
      eventoSchema.findOneAndUpdate({'responsavel':{$elemMatch:{'cpf':cpf}},'_id':id},
        {'$set': {'responsavel.$.certificados': {tipo:tipo}}}, [{new:true}],
        (err, usr) => {
          if (err) return reject(err)
          eventoSchema.find({'responsavel.cpf':cpf}, 'tipo titulo cargaHoraria data responsavel.$ -_id', (err, usr) => {
            let array = []
            console.log(usr[0].responsavel[0]);
            for (let i in usr) {
              let participante = {
                responsavel: usr[i].responsavel[0].nome,
                tipo: usr[i].tipo,
                titulo: usr[i].titulo,
                cargaHoraria: usr[i].cargaHoraria,
                token: usr[i].responsavel[0].certificados[0]._id,
                tokentipo: usr[i].responsavel[0].certificados[0].tipo
              }
              array.push(participante)
            }
            var retorno = {
              tipo:tipo,
              evento:array
            }
            fulfill(retorno)
          })
        })
    })
  }

  function pesquisaPremiado(cpf) {
    return new Promise(function (fullfill, reject) {
      premiadoSchema.find({'integrantes.cpf':cpf}, 'integrantes.$ categoria eixo colocacao mostratec token nomeProjeto numInscricao _id',(err, usr) => {
        if (err) return reject(err)
        if (usr == 0) return reject({err})
        fullfill(usr)
        console.log(usr)
      })
    })
  }

  function inserirTokenPremiado(cpf, id) {
    console.log("aaaaaaaaaa");
    console.log(cpf +"      "+id+"      "+tipo)
    return new Promise(function (fullfill, reject) {
      var newId = new mongoose.mongo.ObjectId()
      premiadoSchema.findOneAndUpdate({'_id':id},
        {'$set': {'token': newId}}, [{new:true}],
        (err, usr) => {
          if (err) return reject(err)
          if (err) console.log('OKKKKKKKKKKK')
          // premiadoSchema.find({'integrantes':{$elemMatch:{'cpf':cpf}}}, ' integrantes.$ nomeProjeto numInscricao token categoria eixo colocacao -_id', (err, usr) => {
          //   let array = []
          //   console.log(usr[0].token);
          //   for (let i in usr) {
          //     let participante = {
          //       nome: usr[i].integrantes[0].nome,
          //       nomeProjeto: usr[i].nomeProjeto,
          //       categoria: usr[i].categoria,
          //       eixo: usr[i].eixo,
          //       colocacao: usr[i].colocacao,
          //       token: usr[i].token
          //     }
          //     array.push(participante)
          //   }
          //   var retorno = {
          //     tipo:'Premiado',
          //     evento:array
          //   }
          //   fulfill(retorno)
          // })
          fullfill(usr)
        })
    })
  }

  function pesquisaProjetoOrientador2(cpf) {
    return new Promise(function (fullfill, reject) {
    ProjetoSchema.find(
      {'integrantes':{$elemMatch:{'cpf':cpf, 'tipo':'Orientador'}}, 'aprovado':true},
      'integrantes.$ nomeProjeto numInscricao -_id',(err, usr) => {
    if (err) return reject(err)
    if (usr == 0) return reject({err})
    let array = []
    for (let i in usr) {
      var participante = {
        tipo: usr[i].integrantes[0].tipo,
        nome: usr[i].integrantes[0].nome,
        nomeProjeto: usr[i].nomeProjeto,
        token: usr[i].integrantes[0].certificados[0]._id,
        tokentipo: usr[i].integrantes[0].certificados[0].tipo
      }
      array.push(participante)
    }

    var retorno = {
      tipo:'ProjetoOrientador',
      integrantes:array
    }
    fullfill(retorno)
  })
})}

  function inserirToken2(cpf, numInscricao, tipo) {
    return new Promise(function (fullfill, reject) {
      ProjetoSchema.findOneAndUpdate({'integrantes':{$elemMatch:{'cpf':cpf}},'numInscricao':numInscricao},
        {'$set': {'integrantes.$.certificados': {tipo:tipo}}}, [{new:true}],
        (err, usr) => {
          if (err) return reject(err)
          fullfill(usr)
        })
    })
  }

  const one = pesquisaProjetoAluno(cpf).then(usr => {
    let contador = false
    let array = []
    for (let i in usr) {
        if (usr[i].integrantes[0].certificados !== undefined && usr[i].integrantes[0].certificados[0]._id !== undefined) {
          contador = true
          var participante = {
            tipo: usr[i].integrantes[0].tipo,
            nome: usr[i].integrantes[0].nome,
            nomeProjeto: usr[i].nomeProjeto,
            token: usr[i].integrantes[0].certificados[0]._id,
            tokentipo: usr[i].integrantes[0].certificados[0].tipo
          }
          array.push(participante)
      } else {
        return inserirToken(cpf, usr[i].numInscricao, "ProjetoAluno")
      }
    }
    if (contador === true) {
    return {
      tipo:'ProjetoAluno',
      integrantes:array
    }
  }
  })
  .catch(err => console.log("Não encontrou nada nos projetos. " + err.message))

  const two = pesquisaAvaliador(cpf).then(usr => {
    return pesquisaAvaliador2(cpf).then(usr => ({
      tipo: "Avaliador",
      nome: usr[0].nome,
      token: usr[0].token
    }))
  })
  .catch(err => console.log("Não encontrou nada nos avaliadores. " + err.message))

  const three = pesquisaParticipante(cpf).then(usr => {
    // console.log(usr[0].tokenSaberes)
    // let array = []
    let contador1 = false
    let contador2 = false
    if (usr[0].eventos.length > 0) {
      for (var i in usr[0].eventos) {
        if (usr[0].eventos[i].tipo === 'Oficina') {
          contador1 = true;
        }
        else if (usr[0].eventos[i].tipo === 'Seminário Saberes Docentes') {
          contador2 = true;
        }
      }
    }
    if (usr[0].tokenSaberes === undefined && contador2) {
      let newId = new mongoose.mongo.ObjectId()
      participanteSchema.findOneAndUpdate({'cpf':cpf},
        {'$set': {'tokenSaberes': newId}}, [{new:true}],
        (err, usr) => {
          console.log("OK")
      })
    }
    if (usr[0].tokenOficinas === undefined && contador1) {
      let newId = new mongoose.mongo.ObjectId()
      participanteSchema.findOneAndUpdate({'cpf':cpf},
        {'$set': {'tokenOficinas': newId}}, [{new:true}],
        (err, usr) => {
          console.log("OK")
      })
    }
    return pesquisaParticipante(cpf)
  })
  .then(usr => {
    // let array = []
    let participante = {
      tipo: "Participante",
      nome: usr[0].nome,
      tokenSaberes: usr[0].tokenSaberes,
      tokenOficinas: usr[0].tokenOficinas,
      eventos: usr[0].eventos
    }
    // array.push(participante)
    return participante
  })
  .catch(err => console.log("Não encontrou nada nos participantes dos eventos. " + err.message))

  const four = pesquisaEvento(cpf).then(usr => {
    console.log("AINDA EVENTO \n"+usr)
    let array = []
    let contador = false
    for (let i in usr) {
      if (usr[i].responsavel[0].certificados[0] !== undefined) {
        console.log(usr[i].responsavel[0]);
        contador = true
        console.log("CONTADO: "+contador)
        let participante = {
          responsavel: usr[i].responsavel[0].nome,
          tipo: usr[i].tipo,
          titulo: usr[i].titulo,
          cargaHoraria: usr[i].cargaHoraria,
          token: usr[i].responsavel[0].certificados[0]._id,
          tokentipo: usr[i].responsavel[0].certificados[0].tipo
        }
        array.push(participante)
      } else if (usr[i].responsavel[0].certificados[0] == undefined) {
        console.log("CHEGAMOS AQUI ENT")
        return inserirTokenEvento(cpf, usr[i]._id, "Evento")
      }
    }
    if (contador === true) {
      return {
        tipo:'Evento',
        evento:array
      }
    }
  })
  .catch(err => console.log("Não encontrou nada nos responsáveis de eventos. " + err.message))

  const five = pesquisaPremiado(cpf).then(usr => {
    // let array = []
    // for(let i in usr) {
    //   let premiado = {
    //     nome: usr[i].integrantes[0].nome,
    //     nomeProjeto: usr[i].nomeProjeto,
    //     categoria: usr[i].categoria,
    //     eixo: usr[i].eixo,
    //     colocacao: usr[i].colocacao,
    //     token: usr[i].token
    //   }
    //   if (premiado.token == undefined) {
    //     var newId = new mongoose.mongo.ObjectId()
    //     premiadoSchema.findOneAndUpdate({'_id':usr[i]._id},
    //     {'$set': {'token': newId}}, [{new:true}],
    //     (err, usr) => {
    //       // console.log(err)
    //       // console.log(usr)
    //     })
    //   } else {
    //     array.push(premiado)
    //   }
    // }
    // return {
    //   tipo:'Premiado',
    //   projetos:array
    // }
    let array = []
    for(let i in usr) {
      if (usr[i].token == undefined) {
        var newId = new mongoose.mongo.ObjectId()
        premiadoSchema.findOneAndUpdate({'_id':usr[i]._id},
        {'$set': {'token': newId}}, [{new:true}],
        (err, usr) => {
          // console.log(err)
          console.log(usr)
        })
        // .then(usr => {
        //   for(let i in usr) {
        //     let premiado = {
        //       nome: usr[i].integrantes[0].nome,
        //       nomeProjeto: usr[i].nomeProjeto,
        //       categoria: usr[i].categoria,
        //       eixo: usr[i].eixo,
        //       colocacao: usr[i].colocacao,
        //       token: usr[i].token
        //     }
        //     array.push(premiado)
        //   }
        // })
      }
    }
    // for (let i in usr) {
    //   let premiado = {
    //     nome: usr[i].integrantes[0].nome,
    //     nomeProjeto: usr[i].nomeProjeto,
    //     categoria: usr[i].categoria,
    //     eixo: usr[i].eixo,
    //     colocacao: usr[i].colocacao,
    //     token: usr[i].token
    //   }
    //   array.push(premiado)
    // }
    // return {
    //   tipo:'Premiado',
    //   projetos:array
    // // }
    return pesquisaPremiado(cpf)
  }).then(usr => {
    let array = []
    for (let i in usr) {
      let premiado = {
        nome: usr[i].integrantes[0].nome,
        nomeProjeto: usr[i].nomeProjeto,
        categoria: usr[i].categoria,
        eixo: usr[i].eixo,
        colocacao: usr[i].colocacao,
        token: usr[i].token
      }
      array.push(premiado)
    }
    return {
      tipo:'Premiado',
      projetos:array
    }
  })
  .catch(err => console.log("Não encontrou nada nos premiados. " + err.message))

  const six = pesquisaProjetoOrientador(cpf).then(usr => {
    for (let i in usr) {
      if (usr[i].integrantes[0].certificados === undefined || usr[i].integrantes[0].certificados.lenght === 0 ) {
          // console.log("Achei um ProjetoAluno " + usr[i].integrantes[0].certificados[x].id)
          inserirToken2(cpf, usr[i].numInscricao, "ProjetoOrientador");
      }
    }
    return pesquisaProjetoOrientador2(cpf);
  })
  .catch(err => console.log("Não encontrou nada nos projetos orientadores. " + err.message))

  Promise.all([one, two, three, four, five, six])
  .then(arr => {
    res.send(arr.filter(val => val !== undefined))
  })
});

router.post('/conferirCertificado', (req, res) => {
  let id = req.body.id

  function pesquisaProjetoAluno(id) {
    return new Promise(function (fulfill, reject) {
      ProjetoSchema.find(
        {'integrantes':{$elemMatch:{'certificados._id':id,'tipo':'Aluno'}}},
        'integrantes.$ nomeProjeto numInscricao -_id',(err, usr) => {
        if (err) return reject(err)
        if (usr == 0) return reject({err})
        fulfill(usr)
        console.log("1")
      })
    })
  }

  function pesquisaProjetoOrientador(id) {
    return new Promise(function (fulfill, reject) {
      ProjetoSchema.find(
        {'integrantes':{$elemMatch:{'certificados._id':id,'tipo':'Orientador'}}},
        'integrantes.$ nomeProjeto -_id',(err, usr) => {
        if (err) return reject(err)
        if (usr == 0) return reject({err})
        fulfill(usr)
        console.log("2")
      })
    })
  }

  function pesquisaAvaliador(id) {
    return new Promise(function (fulfill, reject) {
      avaliadorSchema.find({'token':id}, 'nome cpf token -_id',(err, usr) => {
        if (err) return reject(err)
        fulfill(usr)
        console.log("3")
      })
    })
  }

  function pesquisaParticipanteSaberes(id) {
    return new Promise(function (fulfill, reject) {
      participanteSchema.find({'tokenSaberes':id}, 'nome tokenSaberes cpf eventos -_id', (err, usr) => {
        if (err) return reject(err)
        fulfill(usr)
        console.log("4")
      })
    })
  }

  function pesquisaParticipanteOficinas(id) {
    return new Promise(function (fulfill, reject) {
      participanteSchema.find({'tokenOficinas':id}, 'nome tokenOficinas cpf eventos -_id', (err, usr) => {
        if (err) return reject(err)
        fulfill(usr)
        console.log("4")
      })
    })
  }

  function pesquisaEvento(id) {
    return new Promise(function (fulfill, reject) {
      eventoSchema.find({'responsavel':{$elemMatch:{'certificados._id':id}}}, 'tipo titulo cargaHoraria data responsavel.$ -_id', (err, usr) => {
        if (err) return reject(err)
        if (usr == 0) return reject({err})
        fulfill(usr)
        console.log("5")
      })
    })
  }

  function pesquisaPremiado(id) {
    return new Promise(function (fulfill, reject) {
      premiadoSchema.find({'token':id}, 'nomeProjeto categoria eixo colocacao token -_id',(err, usr) => {
        if (err) return reject(err)
        if (usr == 0) return reject({err})
        fulfill(usr)
        console.log("6")
      })
    })
  }

  const one = pesquisaProjetoAluno(id).then(usr => {
    // let array = []
      // for (let i in usr) {
        var participante = {
         tipo: usr[0].integrantes[0].tipo,
         nome: usr[0].integrantes[0].nome,
         cpf: usr[0].integrantes[0].cpf,
         nomeProjeto: usr[0].nomeProjeto,
         token: usr[0].integrantes[0].certificados[0]._id
       }
      //  array.push(participante)
    //  }
     return {
       tipo:'ProjetoAluno',
       integrantes:participante
     }
  })
  .catch(err => console.log("Não encontrou nada nos projetos. " + err.message))

  const two = pesquisaAvaliador(id).then(usr => ({
     tipo: "Avaliador",
     nome: usr[0].nome,
     cpf: usr[0].cpf,
     token: usr[0].token
   }))
   .catch(err => console.log("Não encontrou nada nos projetos. " + err.message))

  const three = pesquisaParticipanteSaberes(id).then(usr => ({
     tipo: "Participante",
     nome: usr[0].nome,
     cpf: usr[0].cpf,
     eventos: usr[0].eventos,
     tokenSaberes: usr[0].tokenSaberes
   }))
   .catch(err => console.log("Não encontrou nada nos projetos. " + err.message))

   const four = pesquisaParticipanteOficinas(id).then(usr => ({
      tipo: "Participante",
      nome: usr[0].nome,
      cpf: usr[0].cpf,
      eventos: usr[0].eventos,
      tokenOficinas: usr[0].tokenOficinas
    }))
    .catch(err => console.log("Não encontrou nada nos projetos. " + err.message))

  const five = pesquisaEvento(id).then(usr => {
    //  let array = []
    //  for (let i in usr) {
       let participante = {
         responsavel: usr[0].responsavel[0].nome,
         cpf: usr[0].responsavel[0].cpf,
         tipo: usr[0].tipo,
         titulo: usr[0].titulo,
         cargaHoraria: usr[0].cargaHoraria,
         token: usr[0].responsavel[0].certificados[0]._id
       }
      //  array.push(participante)
    //  }
     return {
       tipo:"Evento",
       evento:participante
     }
   })
   .catch(err => console.log("Não encontrou nada nos projetos. " + err.message))

  const six = pesquisaPremiado(id).then(usr => {
    //  let array = []
    //  for (let i in usr) {
       let premiado = {
         nomeProjeto: usr[0].nomeProjeto,
         categoria: usr[0].categoria,
         eixo: usr[0].eixo,
         colocacao: usr[0].colocacao,
         token: usr[0].token
       }
      //  array.push(premiado)
    //  }
       return {
         tipo: "Premiado",
         projeto: premiado
       }
    })
    .catch(err => console.log("Não encontrou nada nos projetos. " + err.message))

  const seven = pesquisaProjetoOrientador(id).then(usr => {
    // let array = []
    // for (let i in usr) {
      var participante = {
        tipo: usr[0].integrantes[0].tipo,
        nome: usr[0].integrantes[0].nome,
        cpf: usr[0].integrantes[0].cpf,
        nomeProjeto: usr[0].nomeProjeto,
        token: usr[0].integrantes[0].certificados[0]._id
      }
      // array.push(participante)
    // }
    return {
      tipo:'ProjetoOrientador',
      integrantes:participante
    }
  })
  .catch(err => console.log("Não encontrou nada nos projetos. " + err.message))

  Promise.all([one, two, three, four, five, six, seven])
  .then(arr => {
    res.send(arr.filter(val => val !== undefined))
  })
});

router.post('/contato', (req, res) => {
  let email = req.body.email
  ,   nome = req.body.nome
  ,   assunto = req.body.assunto
  ,   mensagem = req.body.mensagem;

  const transporter = nodemailer.createTransport(smtpTransport({
    host: 'smtp.zoho.com',
    port: 587,
    auth: {
      user: "contato@movaci.com.br",
      pass: "mvc2016"
    }
  }));

  var mailOptions = {
    from: 'contato@movaci.com.br',
    to: 'contato@movaci.com.br',
    subject: assunto,
    text: '',
    html: '<b> Contato via site:</b><br><b>De: </b>'+nome+' '+email+'<br><b>Assunto: </b>'+assunto+'<br><b>Mensagem: </b>'+mensagem
  };

  transporter.sendMail(mailOptions, function(error, info){
    if(error){
      return console.log(error);
    } else {
      res.send('success');
    }
    console.log('Message sent: ' + info.response);
  });
});

router.get('/registroProjeto', testaUsernameEEscola, (req, res) => {});

router.post('/registro', testaUsername2, (req, res) => {
  let  username = req.body.username
  ,   password = req.body.password
  ,   password2 = req.body.password2

  req.checkBody('username', 'Username is required').notEmpty();
  req.checkBody('password', 'Password is required').notEmpty();
  req.checkBody('password2', 'Passwords do not match').equals(req.body.password);
  let errors = req.validationErrors();

  if(errors){
    //res.status(501).send('error');
    console.log("Errors: "+errors);
  } else {
    let newIntegrante = ({
      tipo: "Orientador",
      nome: req.body.nomeOrientador1,
      email: req.body.emailOrientador1,
      cpf: splita(req.body.cpfOrientador1),
      telefone: splita(req.body.telefoneOrientador1),
      tamCamiseta: req.body.tamCamisetaOrientador1
    });

    let newIntegrante2 = ({
      tipo: "Orientador",
      nome: req.body.nomeOrientador2,
      email: req.body.emailOrientador2,
      cpf: splita(req.body.cpfOrientador2),
      telefone: splita(req.body.telefoneOrientador2),
      tamCamiseta: req.body.tamCamisetaOrientador2
    });

    let newIntegrante3 = ({
      tipo: "Aluno",
      nome: req.body.nomeAluno1,
      email: req.body.emailAluno1,
      cpf: splita(req.body.cpfAluno1),
      telefone: splita(req.body.telefoneAluno1),
      tamCamiseta: req.body.tamCamisetaAluno1
    });

    let newIntegrante4 = ({
      tipo: "Aluno",
      nome: req.body.nomeAluno2,
      email: req.body.emailAluno2,
      cpf: splita(req.body.cpfAluno2),
      telefone: splita(req.body.telefoneAluno2),
      tamCamiseta: req.body.tamCamisetaAluno2
    });

    let newIntegrante5 = ({
      tipo: "Aluno",
      nome: req.body.nomeAluno3,
      email: req.body.emailAluno3,
      cpf: splita(req.body.cpfAluno3),
      telefone: splita(req.body.telefoneAluno3),
      tamCamiseta: req.body.tamCamisetaAluno3
    });

    let newProject = new ProjetoSchema({
      nomeProjeto: req.body.nomeProjeto,
      categoria: req.body.categoria,
      eixo: req.body.eixo,
      nomeEscola: req.body.nomeEscola,
      cep: splita(req.body.cep),
      cidade: req.body.cidade,
      estado: req.body.estado,
      hospedagem: req.body.hospedagem,
      email: req.body.email,
      username: req.body.username,
      password: req.body.password,
      permissao: 1,
      createdAt: Date.now(),
      resumo: req.body.resumo,
      palavraChave: req.body.palavraChave
    });

    newProject.integrantes.push(newIntegrante);

    if(req.body.nomeOrientador2 && req.body.emailOrientador2 && req.body.cpfOrientador2 && req.body.telefoneOrientador2 && req.body.tamCamisetaOrientador2){
      newProject.integrantes.push(newIntegrante2);
    }

    newProject.integrantes.push(newIntegrante3);

    if(req.body.nomeAluno2 && req.body.emailAluno2 && req.body.cpfAluno2 && req.body.telefoneAluno2 && req.body.tamCamisetaAluno2){
      newProject.integrantes.push(newIntegrante4);
    }

    if(req.body.nomeAluno3 && req.body.emailAluno3 && req.body.cpfAluno3 && req.body.telefoneAluno3 && req.body.tamCamisetaAluno3){
      newProject.integrantes.push(newIntegrante5);
    }

    Projeto.createProject(newProject);

    let email = req.body.email
    let nomeProjeto = req.body.nomeProjeto
    let username = req.body.username
    var templatesDir = path.resolve(__dirname, '..', 'templates');
    var template = new EmailTemplate(path.join(templatesDir, 'inscricao'));
    const transport = nodemailer.createTransport(smtpTransport({
      host: 'smtp.zoho.com',
      port: 587,
      auth: {
        user: "contato@movaci.com.br",
        pass: "mvc2016"
      }
    }));

    var locals = {
      email: email,
      projeto: nomeProjeto,
      username: username
    }

    template.render(locals, function (err, results) {
      if (err) throw err;
      transport.sendMail({
        from: 'V MOVACI <contato@movaci.com.br>',
        to: locals.email,
        subject: 'V MOVACI - Confirmação de inscrição',
        html: results.html,
        text: results.text
      }, function (err, responseStatus) {
        if (err) throw err;
      })
    });
    // res.redirect('/projetos/login');
  }
  //res.send('OK');
});

passport.use('unico', new LocalStrategy(function(username, password, done) {
  Projeto.getLoginProjeto(username, (err, user) => {
    if(err) throw err;
    if(!user){
      console.log('entrou no !user '+username);
      Projeto.getLoginAdmin(username, (err, user) => {
        console.log('entrou no !user de novo');
        if(err) throw err;
        if(!user){
          console.log('entrou no !user de novo de novo');
          return done(null, false, {message: 'Unknown User'});
        }
        Projeto.compareLogin(password, user.password, (err, isMatch) => {
          console.log('OLHA, deu certo e agora vai comparar: '+password);
          if(err) throw err;
          if(isMatch){
            return done(null, user);
            console.log("Pior que deu");
          } else {
            console.log("Pior que não deu");
            return done(null, false, {message: 'Invalid password'});
          }
        });
      });
      // return done(null, false, {message: 'Unknown User'});
    } else {
      Projeto.compareLogin(password, user.password, (err, isMatch) => {
        if(err) throw err;
        if(isMatch){
          return done(null, user);
        } else {
          return done(null, false, {message: 'Invalid password'});
        }
      });
    }
  });
}));

passport.serializeUser(function(user, done){ done(null, user.id) });

passport.deserializeUser(function(id, done){
  adminSchema.findById(id, function(err, user){
    if(err) done(err);
    if(user){
      done(null, user);
    } else {
      ProjetoSchema.findById(id, function(err, user){
        if(err) done(err);
        done(null, user);
      })
    }
  });
});

router.post('/login', passport.authenticate('unico'), (req, res) => {
  // res.send(req.session);
  if (req.user.permissao === "1") {
    // res.redirect('/projetos/');
    res.send({redirect:'/projetos'});
  } else if (req.user.permissao === "2") {
    // res.redirect('/admin/');
    res.send({redirect:'/admin/home'});
  } else if (req.user.permissao === "3") {
    // res.redirect('/admin/');
    res.send({redirect:'/master'});
  }
  //res.cookie('userid', user.id, { maxAge: 2592000000 });  // Expires in one month
});

router.post('/logout', (req, res) => {
  req.logout();
  //res.sendStatus(200);
  //res.clearCookie('userid');
  res.redirect('/');
});

router.post('/redefinir-senha', (req, res) => {
  let username = req.body.username;
  console.log(username);
  crypto.randomBytes(20, (err, buf) => {
    let token = buf.toString('hex');

    ProjetoSchema.findOneAndUpdate({username: username}, {$set:{resetPasswordToken:token, resetPasswordCreatedDate:Date.now() + 3600000}}, {upsert:true, new: true}, function(err, doc){
      if(err){
        console.log("Something wrong when updating data!");
      } else{
        let email = doc.email;
        let nome_projeto = doc.nomeProjeto;
        let url = "http://www.movaci.com.br/nova-senha/"+token;
        // let url = "http://www.movaci.com.br/nova-senha/"+username+"/"+token;

        // res.sendStatus(200);
        res.send(url);

        var templatesDir = path.resolve(__dirname, '..', 'templates')
        var template = new EmailTemplate(path.join(templatesDir, 'redefinicao'))
        // Prepare nodemailer transport object
        const transport = nodemailer.createTransport(smtpTransport({
          host: 'smtp.zoho.com',
          port: 587,
          auth: {
            user: "contato@movaci.com.br",
            pass: "mvc2016"
          }
        }));

        var locals = {
          email: email,
          projeto: nome_projeto,
          url: url,
        }

        template.render(locals, function (err, results) {
          if (err) {
            return console.error(err)
          }

          transport.sendMail({
            from: 'V MOVACI <contato@movaci.com.br>',
            to: locals.email,
            subject: 'V MOVACI - Redefinição de senha',
            html: results.html,
            text: results.text
          }, function (err, responseStatus) {
            if (err) {
              return console.error(err)
            }
            console.log(responseStatus.message)
          })
        });
      }
    });
  });
});

router.post('/nova-senha/:token', (req, res) => {
  if(req.params.token === '') {
    res.status(400).send("erro");
    //console.log('err');
  } else {
    ProjetoSchema.findOne({resetPasswordToken: (req.params.token)}, (err, usr) => {
      if(err || !usr) {
        res.status(400).send("erro2");
      } else if(usr.resetPasswordToken == req.params.token && !usr.hasExpired()) {
        usr.resetPasswordToken = undefined;
        usr.resetPasswordCreatedDate = undefined;
        let password = req.body.password;

        bcrypt.genSalt(10, (err, salt) => {
          bcrypt.hash(password, salt, (err, hash) => {
            usr.password = hash;
            usr.save((err, usr) => {
              if(err) throw err;
              //console.log(usr);
              res.status(200).send('Senha alterada');
            });
          });
        });
      } else {
        res.status(400).send("erro3");
      }
    });
  };
});

//GET na homepage (/).
router.all('/', function(req, res, next) {
  res.render('layout2.ejs');
});

// administração interna ==================================================== //
// router.get('/admin', function(req, res, next) {
//   res.render('layout_admin.ejs');
// });

router.get('/admin/home', function(req, res, next) {
  res.render('layout_admin2.ejs');
});

// router.get('/admin/master', function(req, res, next) {
//   res.render('layout_master.ejs');
// });

router.all('/master', function(req, res, next) {
  res.render('layout_admin2.ejs');
});

router.all('/master/*', function(req, res, next) {
  res.render('layout_admin2.ejs');
});
// ========================================================================== //

// avaliação ================================================================ //
router.get('/avaliacao/2016', function(req, res, next) {
  res.render('layout_avaliacao.ejs');
});
router.get('/avaliacao/2016/*', function(req, res, next) {
  res.render('layout_avaliacao2.ejs');
});
router.get('/ranking/2016', function(req, res, next) {
  res.render('layout_avaliacao2.ejs');
});
// ========================================================================== //

router.get('/projetos/confirma/*', function(req, res, next) {
  res.render('layout_admin2.ejs');
});

router.get('/regulamento', function(req, res, next) {
  res.render('layout3.ejs');
});

router.get('/avaliacao-fundamental', function(req, res, next) {
  res.render('layout3.ejs');
});

router.get('/avaliacao-medio', function(req, res, next) {
  res.render('layout3.ejs');
});

router.get('/avaliacao-medio-extensao', function(req, res, next) {
  res.render('layout3.ejs');
});

router.get('/contato', function(req, res, next) {
  res.render('layout3.ejs');
});

router.get('/programacao', function(req, res, next) {
  res.render('layout3.ejs');
});

router.get('/categorias-eixos', function(req, res, next) {
  res.render('layout3.ejs');
});

// router.all('/projetos/*', function(req, res, next) {
//   res.render('layout.ejs');
// });

router.all('/projetos', function(req, res, next) {
  res.render('layout.ejs');
});

router.all('/404', function(req, res, next) {
  res.render('layout.ejs');
});

router.get('/projetos/inscricao', function(req, res, next) {
  res.render('layout.ejs');
});

router.get('/saberes-docentes/inscricao', function(req, res, next) {
  res.render('layout.ejs');
});

router.get('/avaliadores/inscricao', function(req, res, next) {
  res.render('layout.ejs');
});

router.all('/nova-senha/*', function(req, res, next) {
  res.render('layout.ejs');
});

router.get('/certificados', function(req, res, next) {
  res.render('layout.ejs');
});

// router.all('/redefinir-senha', function(req, res, next) {
//   res.render('layout.ejs');
// });

module.exports = router;
