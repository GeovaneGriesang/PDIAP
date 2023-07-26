'use strict';

const express = require('express')
, router = express.Router()
, passport = require('passport')
, LocalStrategy = require('passport-local').Strategy
, Projeto = require('../controllers/projeto-controller')
, session = require('express-session')
, ProjetoSchema = require('../models/projeto-schema')
, CadastroMostraSchema = require('../models/cMostra-schema')
, CadastroDocumentoSchema = require('../models/documento-schema')
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
  let query2 = req.body.username
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

router.get('/edit', (req, res) => {
	return new Promise(function (fulfill, reject) {
		adminSchema.find({'username':'admin2'},'dias mes ano edicao cadastro_avaliadores cadastro_projetos saberes_docentes text -_id',(err,usr)=>{
			if(err) return reject(err);
			if(usr == 0) return reject({err});
			res.send(usr);
		})						
	})
});

router.get('/getOpcoes', (req, res) => {
	return new Promise(function (fulfill, reject) {
		adminSchema.find({'username':'admin2'},'opcoes -_id',(err,usr)=>{
			if(err) return reject(err);
			if(usr == 0) return reject({err});
			res.send(usr[0].opcoes);
		})						
	})
});

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
      ProjetoSchema.find(
        {'integrantes':{$elemMatch:{'cpf':cpf,'presenca':true, 'tipo':'Aluno'}}, 'aprovado':{$exists: true}},
        'integrantes.$ nomeProjeto numInscricao createdAt categoria -_id',(err, usr) => {
        if (err) return reject(err)
        if (usr == 0) return reject({err})
        fulfill(usr)
      })
    })
  }

  function pesquisaProjetoOrientador(cpf) {
    return new Promise(function (fulfill, reject) {
      ProjetoSchema.find(
        {'integrantes':{$elemMatch:{'cpf':cpf, 'tipo':'Orientador'}}, 'aprovado':{$exists: true}},
        'integrantes.$ nomeProjeto numInscricao createdAt -_id',(err, usr) => {
        if (err) return reject(err)
        if (usr == 0) return reject({err})
        fulfill(usr)
      })
    })
  }


  function inserirTokenAvaliador(cpf, createdAt, tipo) {
    return new Promise(function (fullfill, reject) {
      avaliadorSchema.findOneAndUpdate({'cpf':cpf,'createdAt':createdAt},{$set:{'token': new mongoose.mongo.ObjectId()}}, [{new:true}],(err, usr) => {})
    })
  }

  function pesquisaAvaliador(cpf) {
    return new Promise(function (fullfill, reject) {
      avaliadorSchema.find({'cpf':cpf,'avaliacao':true}, 'nome token createdAt _id -_id',(err, usr) => {
        if (err) return reject(err)
        fullfill(usr)
      })	
    })
  }

  function pesquisaParticipante(cpf) {
    return new Promise(function (fullfill, reject) {
      participanteSchema.find({'cpf':cpf}, 'nome tokenSaberes tokenOficinas eventos createdAt -_id', (err, usr) => {
        if (err) return reject(err)
        fullfill(usr)
      })
    })
  }

  function pesquisaEvento(cpf) {
    return new Promise(function (fullfill, reject) {
      eventoSchema.find({'responsavel.cpf':cpf}, 'tipo titulo cargaHoraria data responsavel.$ createdAt', (err, usr) => {
        if (err) return reject(err)
        if (usr == 0) return reject({err})
        fullfill(usr)
        console.log("EVENTO \n"+usr)
      })
    })
  }

  function inserirToken(cpf, id, tipo) {
    var obj = {"_id":new mongoose.mongo.ObjectId(),  "tipo":tipo};
      ProjetoSchema.findOneAndUpdate({'integrantes':{$elemMatch:{'cpf':cpf,'_id':id}}},
        {'$set': {'integrantes.$.certificados': obj}}, [{new:true}],
        (err, usr) => {})
  }

  function inserirTokenEvento(cpf, id, tipo) {
    var obj = {"_id":new mongoose.mongo.ObjectId(),  "tipo":tipo};
      eventoSchema.findOneAndUpdate({'responsavel':{$elemMatch:{'cpf':cpf,'_id':id}}},
        {'$set': {'responsavel.$.certificados': obj}}, [{new:true}],
        (err, usr) => {	})
  }

  function pesquisaPremiado(cpf) {
    return new Promise(function (fullfill, reject) {
      ProjetoSchema.find({'integrantes.cpf':cpf, 'premiacao':{$exists:true}}, 'integrantes.$ categoria eixo premiacao colocacao token nomeProjeto numInscricao _id createdAt',(err, usr) => {
        if (err) return reject(err)
        if (usr == 0) return reject({err})
        fullfill(usr)
      })
    })
  }

  function inserirTokenPremiado(cpf, id) {
      var newId = new mongoose.mongo.ObjectId()
      ProjetoSchema.findOneAndUpdate({'_id':id},
        {'$set': {'token': newId}}, [{new:true}],
        (err, usr) => {})
  }

  const one = pesquisaProjetoAluno(cpf).then(usr => {
    for (let i in usr) {
        if (usr[i].integrantes[0].certificados == undefined || usr[i].integrantes[0].certificados._id == undefined) {          
		inserirToken(cpf, usr[i].integrantes[0]._id, "ProjetoAluno");
        }
    }
    return pesquisaProjetoAluno(cpf);
  }).then(usr => {
	let array = [];
	for(let i in usr){
	  var ano = new Date(usr[i].createdAt).getFullYear();
          var participante = {
            tipo: usr[i].integrantes[0].tipo,
            nome: usr[i].integrantes[0].nome,
            nomeProjeto: usr[i].nomeProjeto,
            token: usr[i].integrantes[0].certificados._id,
            tokentipo: usr[i].integrantes[0].certificados.tipo,
	    createdAt: usr[i].createdAt,
	    ano: ano,
	    categoria: usr[i].categoria
          }
          array.push(participante);
	}
	return {
		tipo:'ProjetoAluno',
		integrantes:array
    	}
  })
  .catch(err => console.log("Não encontrou nada nos projetos - alunos." + err.message))


  const two = pesquisaAvaliador(cpf).then(usr =>{
  	for(let i in usr){
		if(usr.length > 0 && usr[i].token === undefined){
			inserirTokenAvaliador(cpf, usr[i]._id, "Avaliador");
		}
	}	
	return pesquisaAvaliador(cpf)
  }).then(usr => {
	let array = [];
	for(let i in usr){
		var ano = new Date(usr[i].createdAt).getFullYear()
		var avaliador = {
			email: usr[i].email,
			nome: usr[i].nome,	
			token: usr[i].token,
			createdAt: usr[i].createdAt,
			ano: ano
		};
		array.push(avaliador);
	}
	return{
		tipo:'Avaliador',
		avaliadores:array
	}
  }).catch(err => console.log("Não encontrou nada nos avaliadores. " + err.message))

  const three = pesquisaParticipante(cpf).then(usr => {
    // let array = []
    let contador1 = false;
    let contador2 = false;
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
    var ano = new Date(usr[0].createdAt).getFullYear();
    let participante = {
      tipo: "Participante",
      nome: usr[0].nome,
      tokenSaberes: usr[0].tokenSaberes,
      tokenOficinas: usr[0].tokenOficinas,
      eventos: usr[0].eventos,
      ano: ano
    }
    // array.push(participante)
    return participante
  })
  .catch(err => console.log("Não encontrou nada nos participantes dos eventos. " + err.message))

  const four = pesquisaEvento(cpf).then(usr => {
    for (let i in usr) {
      if (usr[i].responsavel[0].certificados == undefined || usr[i].responsavel[0].certificados._id == undefined) {
        inserirTokenEvento(cpf, usr[i].responsavel[0]._id, "Evento");
      }
    }
    return pesquisaEvento(cpf);
  }).then(usr => {
	let array = [];
	for (let i in usr) {
		var ano = new Date(usr[i].createdAt).getFullYear()
		let participante = {
        	  responsavel: usr[i].responsavel[0].nome,
        	  tipo: usr[i].tipo,
        	  titulo: usr[i].titulo,
        	  cargaHoraria: usr[i].cargaHoraria,
        	  token: usr[i].responsavel[0].certificados[0]._id,
        	  tokentipo: usr[i].responsavel[0].certificados[0].tipo,
		  createdAt: usr[i].createdAt,
		  ano: ano
        	};
        	array.push(participante);		
	}
	return {
        	tipo:'Evento',
        	evento:array
      	}	
  }).catch(err => console.log("Não encontrou nada nos responsáveis de eventos. " + err.message))

  const five = pesquisaPremiado(cpf).then(usr => {
    for (let i in usr) {
        if (usr[i].token == undefined) {          		
         	inserirTokenPremiado(cpf, usr[i]._id);			
      	}
    }
    return pesquisaPremiado(cpf);
  }).then(usr => {
	let array = [];
    	for (let i in usr) {
		if(usr[i].premiacao === 'Premiado'){
			var ano = new Date(usr[i].createdAt).getFullYear();
			let premiado = {
	     			nome: usr[i].integrantes[0].nome,
				nomeProjeto: usr[i].nomeProjeto,
				categoria: usr[i].categoria,
				premiacao: usr[i].premiacao,
				eixo: usr[i].eixo,
        			colocacao: usr[i].colocacao,
        			token: usr[i].token,
        			createdAt: usr[i].createdAt,
				ano: ano
      			};
			array.push(premiado);
		}		
	}
	return {
		tipo: 'Premiado',
		projetos: array
	}
  })
  .catch(err => console.log("Não encontrou nada nos premiados. " + err.message))

  const five2 = pesquisaPremiado(cpf).then(usr => {//Menção honrosa
    for (let i in usr) {
        if (usr[i].token == undefined) {          		
         	inserirTokenPremiado(cpf, usr[i]._id);	
      	}
    }
    return pesquisaPremiado(cpf);
  }).then(usr => {
	let array = [];
    	for (let i in usr) {		
		if(usr[i].premiacao === 'Mencao_honrosa'){
			var ano = new Date(usr[i].createdAt).getFullYear();
			let premiado = {
     				nome: usr[i].integrantes[0].nome,
				nomeProjeto: usr[i].nomeProjeto,
				categoria: usr[i].categoria,
				premiacao: usr[i].premiacao,
				eixo: usr[i].eixo,
        			token: usr[i].token,
        			createdAt: usr[i].createdAt,
				ano: ano
      			};
			array.push(premiado);
		}		
	}
	return {
		tipo: 'Mencao_honrosa',
		projetos: array
	}
  })
  .catch(err => console.log("Não encontrou nada em menção honrosa. " + err.message))

  const six = pesquisaProjetoOrientador(cpf).then(usr => {
	console.log("USR:"+JSON.stringify(usr));
    	for (let i in usr) {
        	if (usr[i].integrantes[0].certificados == undefined || usr[i].integrantes[0].certificados._id == undefined) {
			inserirToken(cpf, usr[i].integrantes[0]._id, "ProjetoOrientador");
      		}
    	}
	return pesquisaProjetoOrientador(cpf);
  }).then(usr => {
	let array = [];
	for(let i in usr) {
		var ano = new Date(usr[i].createdAt).getFullYear();
		var participante = {
        	   tipo: usr[i].integrantes[0].tipo,
       		   nome: usr[i].integrantes[0].nome,
       		   nomeProjeto: usr[i].nomeProjeto,
       		   token: usr[i].integrantes[0].certificados._id,
       		   tokentipo: usr[i].integrantes[0].certificados.tipo,
		   createdAt: usr[i].createdAt,
		   ano: ano
       		};	
       		array.push(participante);
	}
	return {
    	  tipo:'ProjetoOrientador',
    	  integrantes:array
    	}
  }).catch(err => console.log("Não encontrou nada nos projetos - orientadores. " + err.message))

  Promise.all([one, two, three, four, five, five2, six])
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
        'integrantes.$ nomeProjeto numInscricao createdAt -_id',(err, usr) => {
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
        'integrantes.$ nomeProjeto createdAt -_id',(err, usr) => {
        if (err) return reject(err)
        if (usr == 0) return reject({err})
        fulfill(usr)
        console.log("2")
      })
    })
  }

  function pesquisaAvaliador(id) {
    return new Promise(function (fulfill, reject) {
      avaliadorSchema.find({'token':id}, 'nome cpf token createdAt -_id',(err, usr) => {
        if (err) return reject(err)
        fulfill(usr)
        console.log("3")
      })
    })
  }

  function pesquisaParticipanteSaberes(id) {
    return new Promise(function (fulfill, reject) {
      participanteSchema.find({'tokenSaberes':id}, 'nome tokenSaberes cpf eventos createdAt -_id', (err, usr) => {
        if (err) return reject(err)
        fulfill(usr)
        console.log("4")
      })
    })
  }

  function pesquisaParticipanteOficinas(id) {
    return new Promise(function (fulfill, reject) {
      participanteSchema.find({'tokenOficinas':id}, 'nome tokenOficinas cpf eventos createdAt -_id', (err, usr) => {
        if (err) return reject(err)
        fulfill(usr)
        console.log("4")
      })
    })
  }

  function pesquisaEvento(id) {
    return new Promise(function (fulfill, reject) {
      eventoSchema.find({'responsavel':{$elemMatch:{'certificados._id':id}}}, 'tipo titulo cargaHoraria data responsavel.$ createdAt -_id', (err, usr) => {
        if (err) return reject(err)
        if (usr == 0) return reject({err})
        fulfill(usr)
        console.log("5")
      })
    })
  }

  function pesquisaPremiado(id) {
    return new Promise(function (fulfill, reject) {
      ProjetoSchema.find({'token':id}, 'nomeProjeto categoria eixo premiacao colocacao token createdAt -_id',(err, usr) => {
        if (err) return reject(err)
        if (usr == 0) return reject({err})
        fulfill(usr)
        console.log("6")
      })
    })
  }

  const one = pesquisaProjetoAluno(id).then(usr => {
    let array = []
    for (let i in usr) {
	var ano = new Date(usr[0].createdAt).getFullYear();
        var participante = {
         tipo: usr[0].integrantes[0].tipo,
         nome: usr[0].integrantes[0].nome,
         cpf: usr[0].integrantes[0].cpf,
         nomeProjeto: usr[0].nomeProjeto,
         token: usr[0].integrantes[0].certificados._id,
	 ano: ano
      	}
        array.push(participante)
     }
     return {
       tipo:'ProjetoAluno',
       integrantes:participante
     }
  })
  .catch(err => console.log("Não encontrou nada nos projetos - alunos." + err.message))

  const two = pesquisaAvaliador(id).then(usr => {
   var ano = new Date(usr[0].createdAt).getFullYear();
   var obj= {
     tipo: "Avaliador",
     nome: usr[0].nome,
     cpf: usr[0].cpf,
     token: usr[0].token,
     ano: ano
   };
   return obj;
  })
  .catch(err => console.log("Não encontrou nada nos avaliadores. " + err.message))

  const three = pesquisaParticipanteSaberes(id).then(usr => {
   var ano = new Date(usr[0].createdAt).getFullYear();
   var obj = {
     tipo: "Participante",
     nome: usr[0].nome,
     cpf: usr[0].cpf,
     eventos: usr[0].eventos,
     tokenSaberes: usr[0].tokenSaberes,
     ano: ano
   };
   return obj;
  })
  .catch(err => console.log("Não encontrou nada nos participantes saberes. " + err.message))

   const four = pesquisaParticipanteOficinas(id).then(usr => {
    var ano = new Date(usr[0].createdAt).getFullYear();
    var obj = {
      tipo: "Participante",
      nome: usr[0].nome,
      cpf: usr[0].cpf,
      eventos: usr[0].eventos,
      tokenOficinas: usr[0].tokenOficinas,
      ano: ano
    };
    return obj;
   })
   .catch(err => console.log("Não encontrou nada nos participantes oficinas. " + err.message))

  const five = pesquisaEvento(id).then(usr => {
     var ano = new Date(usr[0].createdAt).getFullYear();
     let participante = {
       responsavel: usr[0].responsavel[0].nome,
       cpf: usr[0].responsavel[0].cpf,
       tipo: usr[0].tipo,
       titulo: usr[0].titulo,
       cargaHoraria: usr[0].cargaHoraria,
       token: usr[0].responsavel[0].certificados._id,
       ano: ano
     }
     return {
       tipo:"Evento",
       evento:participante
     }
   })
   .catch(err => console.log("Não encontrou nada nos eventos. " + err.message))

  const six = pesquisaPremiado(id).then(usr => {
	var ano = new Date(usr[0].createdAt).getFullYear();
       let premiado = {
         nomeProjeto: usr[0].nomeProjeto,
         categoria: usr[0].categoria,
         eixo: usr[0].eixo,
	 premiacao: usr[0].premiacao,
         colocacao: usr[0].colocacao,
         token: usr[0].token,
  	 ano: ano
       }
	return {
	   tipo: premiado.premiacao,
	   projeto: premiado
	} 
    })
    .catch(err => console.log("Não encontrou nada nos premiados. " + err.message))

  const seven = pesquisaProjetoOrientador(id).then(usr => {
      var ano = new Date(usr[0].createdAt).getFullYear();
      var participante = {
        tipo: usr[0].integrantes[0].tipo,
        nome: usr[0].integrantes[0].nome,
        cpf: usr[0].integrantes[0].cpf,
        nomeProjeto: usr[0].nomeProjeto,
        token: usr[0].integrantes[0].certificados._id,
	ano: ano
      }
    return {
      tipo:'ProjetoOrientador',
      integrantes:participante
    }
  })
  .catch(err => console.log("Não encontrou nada nos projetos - orientadores. " + err.message))

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
    host: 'smtp.gmail.com',
    port: 587,
    auth: {
      user: "contatomovaci@gmail.com",
      pass: "lenhqdvbmnqvbqdr" // Alteração senha superApp - Lucas Ferreira
    }
  }));

  var mailOptions = {
    from: 'contatomovaci@gmail.com',
    to: 'contatomovaci@gmail.com',
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
    const transport = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      auth: {
        user: "contatomovaci@gmail.com",
        pass: "lenhqdvbmnqvbqdr" // Alteração senha superApp - Lucas Ferreira
      }
    });

    var locals = {
      email: email,
      projeto: nomeProjeto,
      username: username
    }

    //se o programa crasha para mandar o email de confirmação de inscrição é porque a máquina não está com direito para acessar o email
    
    template.render(locals, function (err, results) {
      if (err) throw err;
     	transport.sendMail({
        	from: 'MOVACI <contatomovaci@gmail.com>',
       		to: locals.email,
        	subject: 'MOVACI - Confirmação de inscrição',
        	html: results.html,
        	text: results.text
     	}, function (err, responseStatus) {	
        if (err) throw err;
      	})
    });
     res.redirect('/projetos/login');
  }
  res.send('OK');
});

passport.use('unico', new LocalStrategy(function(username, password, done) {
  var ano_atual = new Date(Date.now());
  console.log('Usuário:'+username);
  Projeto.getLoginProjeto(username, ano_atual.getFullYear(), (err, user) => {    
    if(err) throw err;
    if(!user){
      console.log('Usuário não é de projeto');
      console.log("TESTE:"+JSON.stringify(user));
      Projeto.getLoginAdmin(username, (err, user) => {
        if(err) throw err;
        if(!user){
          console.log('Usuário não é admin. Usuário desconhecido');
          return done(null, false, {message: 'Unknown User'});
        }
        Projeto.compareLogin(password, user.password, (err, isMatch) => {
          console.log('Usuário é admin / Comparação de senha sendo realizada');
          if(err) throw err;
          if(isMatch){
	    console.log("Admin conectado");
            return done(null, user);            
          } else {
            console.log("Erro ao conectar como admin");
            return done(null, false, {message: 'Invalid password'});
          }
        });
      });
      // return done(null, false, {message: 'Unknown User'});
    } else {
      Projeto.compareLogin(password, user.password, (err, isMatch) => {
        if(err) throw err;
	console.log("Usuário é de projeto");
        if(isMatch){
	  console.log("Usuário(Projeto) conectado");
          return done(null, user);
        } else {
	  console.log("Erro ao conectar usuário(Projeto)");
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
  console.log('meuusuario:'+ username);
  crypto.randomBytes(20, (err, buf) => {
    let token = buf.toString('hex');

    ProjetoSchema.findOneAndUpdate({username: username}, {$set:{resetPasswordToken:token, resetPasswordCreatedDate:Date.now() + 3600000}}, {upsert:true, new: true}, function(err, doc){
      if(err){
        return res.status(400).send({ error: 'Não foi possível encontrar o usuário: '+username}) //ARUUMAR A MENSAGEM DE ERRO DO USUARIO
      } else{
        let email = doc.email;
        let nome_projeto = doc.nomeProjeto;
        let url = "http://www.movaci.com.br/nova-senha/"+token;
        // let url = "http://www.movaci.com.br/nova-senha/"+username+"/"+token;

        // res.sendStatus(200);
        res.send(email);

        var templatesDir = path.resolve(__dirname, '..', 'templates')
        var template = new EmailTemplate(path.join(templatesDir, 'redefinicao'))
        // Prepare nodemailer transport object
        const transport = nodemailer.createTransport(smtpTransport({
          host: 'smtp.gmail.com',
          port: 587,
          auth: {
            user: "contatomovaci@gmail.com",
            pass: "lenhqdvbmnqvbqdr" // Alteração senha superApp - Lucas Ferreira
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
            from: 'MOVACI <contatomovaci@gmail.com>',
            to: locals.email,
            subject: 'MOVACI - Redefinição de senha',
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

//Mateus Roberto Algayer - 24/11/2021
//Função para recuperar os dados da mostra na base de dados 
router.get('/getMostraInfo', function(req, res){
  CadastroMostraSchema.find(function(err ,data){
    if(err) throw err;
    res.status(200).send(data);
  });

});

router.get('/getDocumentosInfo', function(req, res){
  CadastroDocumentoSchema.find({'exibe': true}, function(err ,data){
    if(err) throw err;
    res.status(200).send(data);
  });

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
