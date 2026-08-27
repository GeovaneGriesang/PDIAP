'use strict';

const express = require('express')
, router = express.Router()
, passport = require('passport')
, LocalStrategy = require('passport-local').Strategy
, Projeto = require('../controllers/projeto-controller')
, Avaliador = require('../controllers/avaliador-controller')
, Participante = require('../controllers/participante-controller')
, session = require('express-session')
, ProjetoSchema = require('../models/projeto-schema')
, CadastroMostraSchema = require('../models/cMostra-schema')
, CadastroDocumentoSchema = require('../models/documento-schema')
, avaliadorSchema = require('../models/avaliador-schema')
, participanteSchema = require('../models/participante-schema')
, eventoSchema = require('../models/evento-schema')
, feiraSchema = require('../models/feira-schema')
, escolaSchema = require('../models/escola-schema')
, crypto = require('crypto')
, bcrypt = require('bcryptjs')
, Admin = require('../controllers/admin-controller')
, nodemailer = require('nodemailer')
, adminSchema = require('../models/admin-schema')
, mongoose = require('mongoose')
, smtpTransport = require('nodemailer-smtp-transport')
, path = require('path')
, fs = require('fs')
, EmailTemplate = require('email-templates').EmailTemplate
, wellknown = require('nodemailer-wellknown')
, Promise = require('promise')
, async = require('async')
, rateLimit = require('express-rate-limit')
, documentoValidator = require('../utils/documentoValidator');

// Limita tentativas de login e de pedido de redefinição de senha para dificultar força bruta
// e enumeração de usuários. Chave por IP (padrão da lib); conta acertos e erros igualmente.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' }
});

function splita(arg){
  if (arg !== undefined) {
    let data = arg.replace(/([-.() ])/g,'');
    return data;
  }
}

function idValido(id) {
  return typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
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
      return next();
    }
  });
}

router.get('/edit', (req, res) => {
	Admin.getEdicaoAtual((err, usr) => {
		if (err || !usr) return res.sendStatus(500);
		res.send(usr);
	});
});

router.get('/getOpcoes', (req, res) => {
	Admin.getOpcoesAtuais((err, usr) => {
		if (err || !usr || !usr[0]) return res.sendStatus(500);
		res.send(usr[0].opcoes);
	});
});


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


  function inserirTokenAvaliador(cpf, id, tipo) {
    // Bug corrigido: antes buscava por {cpf, createdAt}, mas quem chama essa função
    // (linha abaixo, em "two") sempre passou o _id do avaliador nesse segundo argumento
    // — nunca batia com nenhum documento (createdAt é uma Data, não um _id), então o
    // token nunca era gravado e o avaliador ficava permanentemente sem código.
    return new Promise(function (fullfill, reject) {
      // A Promise nunca era resolvida (callback vazio): quem chamava essa função
      // nunca esperava a gravação terminar de verdade.
      avaliadorSchema.findOneAndUpdate({'_id':id},{$set:{'token': new mongoose.mongo.ObjectId()}}, [{new:true}],(err, usr) => {
        if (err) return reject(err);
        fullfill(usr);
      })
    })
  }

  function pesquisaAvaliador(cpf) {
    return new Promise(function (fullfill, reject) {
      // Projeção corrigida: tinha "_id -_id" ao mesmo tempo (a exclusão vencia e o _id
      // sumia do resultado), o que quebrava o inserirTokenAvaliador logo abaixo, que
      // depende de usr[i]._id para saber QUAL avaliador atualizar. "email" também
      // estava faltando, apesar de ser usado no map de resposta mais abaixo.
      avaliadorSchema.find({'cpf':cpf,'avaliacao':true}, 'nome email token createdAt categoriasEixos categoriasEixosAvaliados',(err, usr) => {
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

  // Bug corrigido (mesma classe do já corrigido em inserirTokenAvaliador, logo abaixo):
  // essas duas funções não retornavam Promise nenhuma, então quem chamava seguia direto
  // pra reconsulta (pesquisaProjetoAluno/pesquisaEvento) sem esperar a gravação terminar
  // - corrida entre escrever e reler, que às vezes lia o certificado ainda undefined,
  // jogava um TypeError (usr[i]....certificados._id de undefined) que o .catch mais
  // abaixo engolia silenciosamente, sumindo com esse tipo de certificado da resposta pro
  // usuário (o caso relatado: aluno com certificado de premiação mas sem o de
  // participação, porque exatamente essa gravação perdeu a corrida).
  function inserirToken(cpf, id, tipo) {
    var obj = {"_id":new mongoose.mongo.ObjectId(),  "tipo":tipo};
    return new Promise(function (fullfill, reject) {
      ProjetoSchema.findOneAndUpdate({'integrantes':{$elemMatch:{'cpf':cpf,'_id':id}}},
        {'$set': {'integrantes.$.certificados': obj}}, [{new:true}],
        (err, usr) => {
          if (err) return reject(err);
          fullfill(usr);
        })
    });
  }

  function inserirTokenEvento(cpf, id, tipo) {
    var obj = {"_id":new mongoose.mongo.ObjectId(),  "tipo":tipo};
    return new Promise(function (fullfill, reject) {
      eventoSchema.findOneAndUpdate({'responsavel':{$elemMatch:{'cpf':cpf,'_id':id}}},
        {'$set': {'responsavel.$.certificados': obj}}, [{new:true}],
        (err, usr) => {
          if (err) return reject(err);
          fullfill(usr);
        })
    });
  }

  function pesquisaPremiado(cpf) {
    return new Promise(function (fullfill, reject) {
      // Também busca projetos sem premiacao/menção mas classificados pra alguma feira (ver
      // feirasClassificadas em projeto-schema.js) - os dois conceitos são independentes.
      ProjetoSchema.find({'integrantes.cpf':cpf, $or:[{'premiacao':{$exists:true}}, {'feirasClassificadas':{$exists:true,$not:{$size:0}}}]}, 'integrantes.$ categoria eixo premiacao colocacao feirasClassificadas token nomeProjeto numInscricao _id createdAt',(err, usr) => {
        if (err) return reject(err)
        if (usr == 0) return reject({err})
        fullfill(usr)
      })
    })
  }

  function inserirTokenPremiado(cpf, id) {
      var newId = new mongoose.mongo.ObjectId()
      return new Promise(function (fullfill, reject) {
        ProjetoSchema.findOneAndUpdate({'_id':id},
          {'$set': {'token': newId}}, [{new:true}],
          (err, usr) => {
            if (err) return reject(err);
            fullfill(usr);
          })
      });
  }

  const one = pesquisaProjetoAluno(cpf).then(usr => {
    let gravacoes = [];
    for (let i in usr) {
        if (usr[i].integrantes[0].certificados == undefined || usr[i].integrantes[0].certificados._id == undefined) {
		gravacoes.push(inserirToken(cpf, usr[i].integrantes[0]._id, "ProjetoAluno"));
        }
    }
    return Promise.all(gravacoes).then(() => pesquisaProjetoAluno(cpf));
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
  	// Espera as gravações terminarem antes de reconsultar: antes disso não era
  	// esperado, então às vezes a consulta seguinte lia o token ainda vazio.
  	let gravacoes = [];
  	for(let i in usr){
		if(usr.length > 0 && usr[i].token === undefined){
			gravacoes.push(inserirTokenAvaliador(cpf, usr[i]._id, "Avaliador"));
		}
	}
	return Promise.all(gravacoes).then(() => pesquisaAvaliador(cpf))
  }).then(usr => {
	let array = [];
	for(let i in usr){
		var ano = new Date(usr[i].createdAt).getFullYear()
		let avaliadas = (usr[i].categoriasEixosAvaliados && usr[i].categoriasEixosAvaliados.length)
			? usr[i].categoriasEixosAvaliados
			: usr[i].categoriasEixos;
		var avaliador = {
			email: usr[i].email,
			nome: usr[i].nome,
			token: usr[i].token,
			createdAt: usr[i].createdAt,
			ano: ano,
			categoriasAvaliadas: Avaliador.formatarCategoriasEixos(avaliadas)
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
    let gravacoes = [];
    if (usr[0].tokenSaberes === undefined && contador2) {
      let newId = new mongoose.mongo.ObjectId()
      gravacoes.push(new Promise((fullfill, reject) => {
        participanteSchema.findOneAndUpdate({'cpf':cpf},
          {'$set': {'tokenSaberes': newId}}, [{new:true}],
          (err, usr) => {
            if (err) return reject(err);
            fullfill(usr);
        })
      }));
    }
    if (usr[0].tokenOficinas === undefined && contador1) {
      let newId = new mongoose.mongo.ObjectId()
      gravacoes.push(new Promise((fullfill, reject) => {
        participanteSchema.findOneAndUpdate({'cpf':cpf},
          {'$set': {'tokenOficinas': newId}}, [{new:true}],
          (err, usr) => {
            if (err) return reject(err);
            fullfill(usr);
        })
      }));
    }
    return Promise.all(gravacoes).then(() => pesquisaParticipante(cpf))
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
    let gravacoes = [];
    for (let i in usr) {
      if (usr[i].responsavel[0].certificados == undefined || usr[i].responsavel[0].certificados._id == undefined) {
        gravacoes.push(inserirTokenEvento(cpf, usr[i].responsavel[0]._id, "Evento"));
      }
    }
    return Promise.all(gravacoes).then(() => pesquisaEvento(cpf));
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
    let gravacoes = [];
    for (let i in usr) {
        if (usr[i].token == undefined) {
         	gravacoes.push(inserirTokenPremiado(cpf, usr[i]._id));
      	}
    }
    return Promise.all(gravacoes).then(() => pesquisaPremiado(cpf));
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
    let gravacoes = [];
    for (let i in usr) {
        if (usr[i].token == undefined) {
         	gravacoes.push(inserirTokenPremiado(cpf, usr[i]._id));
      	}
    }
    return Promise.all(gravacoes).then(() => pesquisaPremiado(cpf));
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

  // Classificações pra feiras externas (Mostratec, Mostratec Júnior, MOCITEC etc - ver
  // feira-schema.js), independente de premiação/menção honrosa. Um projeto pode estar
  // classificado em mais de uma feira, então gera uma entrada por feira classificada.
  const five3 = pesquisaPremiado(cpf).then(usr => {
    let gravacoes = [];
    for (let i in usr) {
        if (usr[i].token == undefined) {
         	gravacoes.push(inserirTokenPremiado(cpf, usr[i]._id));
      	}
    }
    return Promise.all(gravacoes).then(() => pesquisaPremiado(cpf));
  }).then(usr => {
	let feiraIds = [];
	for (let i in usr) {
		if (usr[i].feirasClassificadas && usr[i].feirasClassificadas.length > 0) {
			usr[i].feirasClassificadas.forEach(id => feiraIds.push(id));
		}
	}
	return feiraSchema.find({'_id':{$in:feiraIds}}, 'nome').then(feiras => ({usr, feiras}));
  }).then(({usr, feiras}) => {
	let array = [];
	for (let i in usr) {
		if (usr[i].feirasClassificadas && usr[i].feirasClassificadas.length > 0) {
			var ano = new Date(usr[i].createdAt).getFullYear();
			usr[i].feirasClassificadas.forEach(feiraId => {
				let feira = feiras.find(f => String(f._id) === String(feiraId));
				if (!feira) return;
				array.push({
					nome: usr[i].integrantes[0].nome,
					nomeProjeto: usr[i].nomeProjeto,
					categoria: usr[i].categoria,
					eixo: usr[i].eixo,
					token: usr[i].token,
					createdAt: usr[i].createdAt,
					ano: ano,
					feiraId: feira._id,
					feiraNome: feira.nome
				});
			});
		}
	}
	return {
		tipo: 'Feira',
		projetos: array
	}
  })
  .catch(err => console.log("Não encontrou nada nas classificações de feira. " + err.message))

  const six = pesquisaProjetoOrientador(cpf).then(usr => {
	console.log("USR:"+JSON.stringify(usr));
	let gravacoes = [];
    	for (let i in usr) {
        	if (usr[i].integrantes[0].certificados == undefined || usr[i].integrantes[0].certificados._id == undefined) {
			gravacoes.push(inserirToken(cpf, usr[i].integrantes[0]._id, "ProjetoOrientador"));
      		}
    	}
	return Promise.all(gravacoes).then(() => pesquisaProjetoOrientador(cpf));
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

  Promise.all([one, two, three, four, five, five2, five3, six])
  .then(arr => {
    res.send(arr.filter(val => val !== undefined))
  })
});

router.post('/conferirCertificado', (req, res) => {
  let id = req.body.id
  if (!idValido(id)) return res.status(400).send({msg: 'ID inválido'});

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
      user: process.env.SMTP_GMAIL_USER,
      pass: process.env.SMTP_GMAIL_PASS
    }
  }));

  var mailOptions = {
    from: 'va-movaci@ifsul.edu.br',
    to: 'va-movaci@ifsul.edu.br',
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
    console.log("Errors: "+errors);
    return res.status(400).send('error');
  } else {
    // Orientador2/Aluno2/Aluno3 são opcionais - só valida documento/telefone deles se
    // o integrante foi de fato preenchido (mesmo critério usado mais abaixo pra decidir
    // se ele entra na lista de integrantes).
    let integrantesParaValidar = [
      { cpf: req.body.cpfOrientador1, telefone: req.body.telefoneOrientador1 },
      { cpf: req.body.cpfAluno1, telefone: req.body.telefoneAluno1 }
    ];
    if (req.body.nomeOrientador2 && req.body.emailOrientador2 && req.body.cpfOrientador2 && req.body.telefoneOrientador2 && req.body.tamCamisetaOrientador2) {
      integrantesParaValidar.push({ cpf: req.body.cpfOrientador2, telefone: req.body.telefoneOrientador2 });
    }
    if (req.body.nomeAluno2 && req.body.emailAluno2 && req.body.cpfAluno2 && req.body.telefoneAluno2 && req.body.tamCamisetaAluno2) {
      integrantesParaValidar.push({ cpf: req.body.cpfAluno2, telefone: req.body.telefoneAluno2 });
    }
    if (req.body.nomeAluno3 && req.body.emailAluno3 && req.body.cpfAluno3 && req.body.telefoneAluno3 && req.body.tamCamisetaAluno3) {
      integrantesParaValidar.push({ cpf: req.body.cpfAluno3, telefone: req.body.telefoneAluno3 });
    }
    for (let j = 0; j < integrantesParaValidar.length; j++) {
      let checagemDoc = documentoValidator.validarDocumento(integrantesParaValidar[j].cpf);
      if (!checagemDoc.valido) return res.status(400).send(checagemDoc.mensagem);
      let checagemTelefone = documentoValidator.validarTelefone(integrantesParaValidar[j].telefone);
      if (!checagemTelefone.valido) return res.status(400).send(checagemTelefone.mensagem);
    }

    let newIntegrante = ({
      tipo: "Orientador",
      nome: req.body.nomeOrientador1,
      email: req.body.emailOrientador1,
      nacionalidade: req.body.nacionalidadeOrientador1,
      cpf: splita(req.body.cpfOrientador1),
      telefone: splita(req.body.telefoneOrientador1),
      tamCamiseta: req.body.tamCamisetaOrientador1
    });

    let newIntegrante2 = ({
      tipo: "Orientador",
      nome: req.body.nomeOrientador2,
      email: req.body.emailOrientador2,
      nacionalidade: req.body.nacionalidadeOrientador2,
      cpf: splita(req.body.cpfOrientador2),
      telefone: splita(req.body.telefoneOrientador2),
      tamCamiseta: req.body.tamCamisetaOrientador2
    });

    let newIntegrante3 = ({
      tipo: "Aluno",
      nome: req.body.nomeAluno1,
      email: req.body.emailAluno1,
      nacionalidade: req.body.nacionalidadeAluno1,
      cpf: splita(req.body.cpfAluno1),
      telefone: splita(req.body.telefoneAluno1),
      tamCamiseta: req.body.tamCamisetaAluno1
    });

    let newIntegrante4 = ({
      tipo: "Aluno",
      nome: req.body.nomeAluno2,
      email: req.body.emailAluno2,
      nacionalidade: req.body.nacionalidadeAluno2,
      cpf: splita(req.body.cpfAluno2),
      telefone: splita(req.body.telefoneAluno2),
      tamCamiseta: req.body.tamCamisetaAluno2
    });

    let newIntegrante5 = ({
      tipo: "Aluno",
      nome: req.body.nomeAluno3,
      email: req.body.emailAluno3,
      nacionalidade: req.body.nacionalidadeAluno3,
      cpf: splita(req.body.cpfAluno3),
      telefone: splita(req.body.telefoneAluno3),
      tamCamiseta: req.body.tamCamisetaAluno3
    });

    let newProject = new ProjetoSchema({
      nomeProjeto: req.body.nomeProjeto,
      categoria: req.body.categoria,
      eixo: req.body.eixo,
      nomeEscola: req.body.nomeEscola,
      escola: req.body.escola || undefined,
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

    Projeto.createProject(newProject, (err, savedProject) => {
      if (err || !savedProject) {
        console.error('Erro ao criar projeto', err);
        return res.status(500).send('error');
      }

      let email = req.body.email
      let nomeProjeto = req.body.nomeProjeto
      let username = req.body.username
      var templatesDir = path.resolve(__dirname, '..', 'templates');
      var template = new EmailTemplate(path.join(templatesDir, 'inscricao'));
      const transport = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        auth: {
          user: process.env.SMTP_GMAIL_USER,
          pass: process.env.SMTP_GMAIL_PASS
        }
      });

      var locals = {
        email: email,
        projeto: nomeProjeto,
        username: username
      }

      //se o programa crasha para mandar o email de confirmação de inscrição é porque a máquina não está com direito para acessar o email

      template.render(locals, function (err, results) {
        if (err) { console.error(err); return; }
       	transport.sendMail({
          	from: 'MOVACI <va-movaci@ifsul.edu.br>',
         		to: locals.email,
          	subject: 'MOVACI - Confirmação de inscrição',
          	html: results.html,
          	text: results.text
       	}, function (err, responseStatus) {
          if (err) { console.error(err); return; }
        	})
      });

      // Autentica o projeto recém-criado na sessão atual, para que o usuário já
      // caia logado na página do projeto em vez de precisar logar manualmente.
      req.login(savedProject, function(err) {
        if (err) {
          console.error('Erro ao autenticar após inscrição', err);
          return res.send({redirect: '/'});
        }
        res.send({redirect: '/projetos'});
      });
    });
  }
});

passport.use('unico', new LocalStrategy(function(username, password, done) {
  var ano_atual = new Date(Date.now());
  console.log('Usuário:'+username);
  Projeto.getLoginProjeto(username, ano_atual.getFullYear(), (err, user) => {    
    if (err) { console.error(err); return; }
    if(!user){
      console.log('Usuário não é de projeto');
      Projeto.getLoginAdmin(username, (err, user) => {
        if (err) { console.error(err); return; }
        if(!user){
          console.log('Usuário não é admin. Tentando avaliador.');
          Avaliador.getLoginAvaliador(username, (err, avaliador) => {
            if (err) { console.error(err); return; }
            if (!avaliador) {
              console.log('Usuário não é avaliador. Tentando participante.');
              Participante.getLoginParticipante(username, (err, participante) => {
                if (err) { console.error(err); return; }
                if (!participante) {
                  console.log('Usuário não é participante. Usuário desconhecido');
                  return done(null, false, {message: 'Unknown User'});
                }
                Participante.compareLoginOuBootstrap(password, participante, (err, isMatch) => {
                  if (err) { console.error(err); return; }
                  if (isMatch) {
                    console.log("Participante conectado");
                    return done(null, participante);
                  } else {
                    console.log("Erro ao conectar como participante");
                    return done(null, false, {message: 'Invalid password'});
                  }
                });
              });
              return;
            }
            Avaliador.compareLoginOuBootstrap(password, avaliador, (err, isMatch) => {
              if (err) { console.error(err); return; }
              if (isMatch) {
                console.log("Avaliador conectado");
                return done(null, avaliador);
              } else {
                console.log("Erro ao conectar como avaliador");
                return done(null, false, {message: 'Invalid password'});
              }
            });
          });
          return;
        }
        Projeto.compareLogin(password, user.password, (err, isMatch) => {
          console.log('Usuário é admin / Comparação de senha sendo realizada');
          if (err) { console.error(err); return; }
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
        if (err) { console.error(err); return; }
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
        if (user) {
          done(null, user);
        } else {
          avaliadorSchema.findById(id, function(err, user){
            if(err) done(err);
            if (user) {
              done(null, user);
            } else {
              participanteSchema.findById(id, function(err, user){
                if(err) done(err);
                done(null, user);
              });
            }
          });
        }
      })
    }
  });
});

router.post('/login', authLimiter, passport.authenticate('unico'), (req, res) => {
  // res.send(req.session);
  if (req.user.constructor.modelName === 'Avaliador') {
    res.send({redirect: req.user.senhaDefinida ? '/avaliadores/dashboard' : '/avaliadores/dashboard/trocar-senha'});
  } else if (req.user.constructor.modelName === 'Participante') {
    res.send({redirect: req.user.senhaDefinida ? '/participantes/dashboard' : '/participantes/dashboard/trocar-senha'});
  } else if (req.user.permissao === "1") {
    // res.redirect('/projetos/');
    res.send({redirect:'/projetos'});
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

router.post('/redefinir-senha', authLimiter, (req, res) => {
  let username = req.body.username;
  console.log('meuusuario:'+ username);
  crypto.randomBytes(20, (err, buf) => {
    let token = buf.toString('hex');

    ProjetoSchema.findOneAndUpdate({username: username}, {$set:{resetPasswordToken:token, resetPasswordCreatedDate:Date.now() + 3600000}}, {new: true}, function(err, doc){
      if(err || !doc){
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
            user: process.env.SMTP_GMAIL_USER,
            pass: process.env.SMTP_GMAIL_PASS
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
            from: 'MOVACI <va-movaci@ifsul.edu.br>',
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
              if (err) { console.error(err); return; }
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
    if (err) { console.error(err); return; }
    res.status(200).send(data);
  });

});

// Feiras cadastradas (nome, categorias e texto do certificado de classificação) - público,
// mesmo padrão de exposição de /getMostraInfo, usado na emissão de certificado de classificação.
router.get('/getFeirasInfo', function(req, res){
  feiraSchema.find(function(err ,data){
    if (err) { console.error(err); return; }
    res.status(200).send(data);
  });
});

// Escolas aprovadas (ver models/escola-schema.js) - lista usada pra seleção no cadastro
// de projeto, no lugar do texto livre digitado antes. Só as aprovadas: uma pendente
// não deveria aparecer pra outra pessoa selecionar antes do admin revisar.
router.get('/getEscolasInfo', function(req, res){
  escolaSchema.find({ status: 'aprovada' }, 'nome cidade estado', function(err, data){
    if (err) { console.error(err); return; }
    res.status(200).send(data);
  });
});

// Solicitação de cadastro de escola nova - usada tanto inline no cadastro de projeto
// (a pessoa não encontrou a escola dela na lista) quanto pelo formulário público
// standalone (/solicitar-escola). Sempre cria como "pendente": a inscrição de projeto
// que originou o pedido segue normalmente usando essa escola pendente, sem travar
// esperando o admin aprovar.
router.post('/solicitarEscola', function(req, res){
  let novaEscola = new escolaSchema({
    nome: req.body.nome,
    cep: req.body.cep,
    cidade: req.body.cidade,
    estado: req.body.estado,
    status: 'pendente',
    origem: req.body.origem === 'formulario_publico' ? 'formulario_publico' : 'inline_inscricao',
    solicitanteNome: req.body.solicitanteNome,
    solicitanteEmail: req.body.solicitanteEmail
  });
  novaEscola.save(function(err, data){
    if (err) { console.error('Erro ao solicitar escola', err); return res.status(500).send('Erro ao solicitar escola'); }
    res.status(200).send(data);
  });
});

router.get('/getDocumentosInfo', function(req, res){
  CadastroDocumentoSchema.find({'exibe': true}, function(err ,data){
    if (err) { console.error(err); return; }
    res.status(200).send(data);
  });

});


//GET na homepage (/).
router.all('/', function(req, res, next) {
  // Galeria de "Edições Anteriores": lista as imagens direto da pasta, então basta
  // adicionar/remover arquivos em public/alpha/images/galeria para atualizar o carrossel,
  // sem precisar editar o HTML.
  let galeriaImagens = [];
  try {
    galeriaImagens = fs.readdirSync(path.join(__dirname, '..', 'public', 'alpha', 'images', 'galeria'))
      .filter((nome) => /\.(jpe?g|png|webp)$/i.test(nome))
      .sort();
  } catch (err) {
    console.error('Erro ao listar galeria de imagens', err);
  }
  res.render('layout2.ejs', { galeriaImagens: galeriaImagens });
});

// administração interna ==================================================== //
// router.get('/admin', function(req, res, next) {
//   res.render('layout_admin.ejs');
// });

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

router.get('/solicitar-escola', function(req, res, next) {
  res.render('layout.ejs');
});

router.get('/avaliadores/inscricao', function(req, res, next) {
  res.render('layout.ejs');
});

// Dashboard do avaliador (login próprio) - só as telas de verdade do lado do cliente
// (ui-routes.js), listadas uma a uma: um wildcard aqui bateria também com as rotas de
// API que routes/avaliadores.js expõe sob esse mesmo prefixo (ex: GET .../loggedin),
// que são casadas depois já que esse router é montado em '/' antes de '/avaliadores'.
router.get([
  '/avaliadores/dashboard',
  '/avaliadores/dashboard/trocar-senha',
  '/avaliadores/dashboard/dados',
  '/avaliadores/dashboard/esqueci-senha',
  '/avaliadores/dashboard/nova-senha/:token'
], function(req, res, next) {
  res.render('layout.ejs');
});

// Dashboard do participante (login próprio) - mesmo cuidado do avaliador acima: lista
// explícita, não wildcard, pra não interceptar as rotas de API de routes/participantes.js.
router.get([
  '/participantes/dashboard',
  '/participantes/dashboard/trocar-senha',
  '/participantes/dashboard/esqueci-senha',
  '/participantes/dashboard/nova-senha/:token'
], function(req, res, next) {
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
