'use strict';

const documentoSchema = require('../models/documento-schema');

const express = require('express')
, router = express.Router()
, passport = require('passport')
, LocalStrategy = require('passport-local').Strategy
, Admin = require('../controllers/admin-controller')
, Evento = require('../controllers/evento-controller')
, Saberes = require('../controllers/saberes-controller')
, session = require('express-session')
, adminSchema = require('../models/admin-schema')
, projetoSchema = require('../models/projeto-schema')
, eventoSchema = require('../models/evento-schema')
, feiraSchema = require('../models/feira-schema')
, participanteSchema = require('../models/participante-schema')
, CadastroMostraSchema = require('../models/cMostra-schema')
, CadastroDocumentoSchema = require('../models/documento-schema')
, crypto = require('crypto')
, bcrypt = require('bcryptjs')
, nodemailer = require('nodemailer')
, smtpTransport = require('nodemailer-smtp-transport')
, path = require('path')
, EmailTemplate = require('email-templates').EmailTemplate
, wellknown = require('nodemailer-wellknown')
, avaliadorSchema = require('../models/avaliador-schema')
, AvaliadorController = require('../controllers/avaliador-controller')
, saberesSchema = require('../models/saberes-schema')
, cadastroMostraSchema = require('../models/cMostra-schema')
, cadastroMostra = require('../controllers/cMostra-controller')
, CadastroDocumento = require('../controllers/documento-controller')
, pdf = require('pdfkit')
, fs = require('fs')
, async = require('async');

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  } else {
    res.sendStatus(403);
  }
}

function splita(arg){
  if (arg !== undefined) {
    let data = arg.replace(/([-.() ])/g,'');
    return data;
  }
}

// Campos que o admin pode alterar de um projeto via PUT /update (ver public/admin/views/editar-projetos.html).
// Qualquer outro campo do body (ex: permissao, password, token) é ignorado; aprovação/premiação
// já têm rotas próprias (upgreice, setPremiadoProjetos) com a lógica correta.
const CAMPOS_EDITAVEIS_PROJETO = ['nomeProjeto', 'categoria', 'eixo', 'participa', 'resumo', 'palavraChave', 'estado', 'cidade', 'cep', 'hospedagem'];

function filtrarCamposEditaveis(body) {
  let filtrado = {};
  CAMPOS_EDITAVEIS_PROJETO.forEach((campo) => {
    if (body[campo] !== undefined) filtrado[campo] = body[campo];
  });
  return filtrado;
}

// Garante que um id vindo do body é uma string simples (formato de ObjectId do Mongo),
// nunca um objeto (ex: {"$ne": null}), que poderia alterar o comportamento da query.
function idValido(id) {
  return typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
}

function miPermiso(role,role2) {
  return function(req, res, next) {
    if(req.user.permissao === role || req.user.permissao === role2)
      next();
    else res.sendStatus(403);
  }
}

// router.all('/*', ensureAuthenticated, miPermiso("2"));
router.all('/*', ensureAuthenticated);

router.get('/loggedin', ensureAuthenticated, (req, res) => {
  res.send('success');
});

router.post('/criarEvento', miPermiso("3"), (req, res) => {
  try {
    let myArray = req.body.responsavel;

    let newEvento = new eventoSchema({
      tipo: req.body.tipo
      ,titulo: req.body.titulo
      ,cargaHoraria: req.body.cargaHoraria
      ,data: req.body.data
      ,createdAt: req.body.createdAt
    });

    myArray.forEach(function (value, i) {
      let newResponsavel = ({
        nome: value.nome
        ,cpf: splita(value.cpf)
      });
      newEvento.responsavel.push(newResponsavel);
    });

    newEvento.save((err, data) => {
      if (err) { console.error('Erro ao criar um evento', err); return; }
      console.log(data);
    });
    res.send('success');
  } catch (error){
    console.log("ProjetoSchema.findOne: " + err); //Mostra onde o erro acontece e em seguida o erro em si 
  }
});

router.get('/mostraEvento', miPermiso("3","2"), (req, res) => {
  try {
    eventoSchema.find((err, usr) => {
      if (err) { console.error('Erro ao mostrar evento', err); return; }
      res.send(usr);
    });
  } catch (error){
    console.log('findOne error--> ${error}');
  }
});

router.put('/removeEvento', miPermiso("3"), (req, res) => {
  try {
    let id = req.body.id;
    if (!idValido(id)) return res.status(400).send('ID inválido');
    eventoSchema.remove({"_id": id}, (err) => {
      if (err) { console.error('Erro ao remover evento', err); return; }
    });
    res.send('success');
  } catch (error){
    console.log('findOne error--> ${error}');
  }
});

// Feiras externas (Mostratec, Mostratec Júnior, MOCITEC, etc) para as quais um projeto pode
// ser classificado - cadastradas por ano, com as categorias às quais se aplicam e o texto do
// certificado de classificação (ver premiacao.html/details.premiacao.html e getFeirasInfo).
router.post('/criarFeira', miPermiso("3"), (req, res) => {
  try {
    let newFeira = new feiraSchema({
      nome: req.body.nome,
      categorias: req.body.categorias,
      textoCertificado: req.body.textoCertificado,
      ano: req.body.ano,
      createdAt: req.body.createdAt
    });
    newFeira.save((err, data) => {
      if (err) { console.error('Erro ao criar feira', err); return; }
    });
    res.send('success');
  } catch (error){
    console.log('findOne error--> ${error}');
  }
});

router.get('/mostraFeiras', miPermiso("3","2"), (req, res) => {
  try {
    feiraSchema.find((err, usr) => {
      if (err) { console.error('Erro ao mostrar feiras', err); return; }
      res.send(usr);
    });
  } catch (error){
    console.log('findOne error--> ${error}');
  }
});

router.put('/removeFeira', miPermiso("3"), (req, res) => {
  try {
    let id = req.body.id;
    if (!idValido(id)) return res.status(400).send('ID inválido');
    feiraSchema.remove({"_id": id}, (err) => {
      if (err) { console.error('Erro ao remover feira', err); return; }
    });
    res.send('success');
  } catch (error){
    console.log('findOne error--> ${error}');
  }
});

router.get('/mostraAvaliadores', miPermiso("3","2"), (req, res) => {
  try {
    avaliadorSchema.find((err, usr) => {
      if (err) { console.error('Erro ao mostrar avaliadores', err); return; }
      res.send(usr);
    });
  } catch (error){
    console.log('findOne error--> ${error}');
  }
});

router.put('/removeAvaliador', miPermiso("3"), (req, res) => {
  try {
    let id = req.body.id;
    if (!idValido(id)) return res.status(400).send('ID inválido');
    avaliadorSchema.remove({"_id": id}, (err) => {
      if (err) { console.error('Erro ao remover avaliador', err); return; }
    });
    res.send('success');
  } catch (error) {
    console.log("ProjetoSchema.findOne: " + err);
  }
});

router.put('/atualizaAvaliador', miPermiso("3"), (req, res) => {
  try {
    let id = req.body.id;
    if (!idValido(id)) return res.status(400).send('ID inválido');

    let checagem = AvaliadorController.validarDocumento(req.body.nacionalidade, req.body.cpf);
    if (!checagem.valido) return res.status(400).send(checagem.mensagem);

    avaliadorSchema.findOneAndUpdate({"_id": id}, {"$set": {
      "nome": req.body.nome,
      "email": req.body.email,
      "nacionalidade": req.body.nacionalidade,
      "cpf": splita(req.body.cpf),
      "rg": splita(req.body.rg),
      "dtNascimento": req.body.dtNascimento,
      "nivelAcademico": req.body.nivelAcademico,
      "categoria": req.body.categoria,
      "eixo": req.body.eixo,
      "atuacaoProfissional": req.body.atuacaoProfissional,
      "tempoAtuacao": req.body.tempoAtuacao,
      "telefone": splita(req.body.telefone),
      "curriculo": req.body.curriculo
    }}, {new:true}, (err, doc) => {
      if (err) { console.error('Erro ao atualizar avaliador', err); return; }
    });
    res.send('success');
  } catch (error) {
    console.log('findOne error--> ${error}');
  }
});

router.post('/criarParticipante', miPermiso("3"), (req, res) => { //alteração Lucas A. Ferreira
  try {
    // Mesmo esquema usado em /avaliadores/registro: permite cadastrar o participante em um
    // ano anterior usando o filtro de ano já existente na tela (ex: cadastro-participantes.html).
    let anoInformado = parseInt(req.body.ano, 10);
    let anoValido = !isNaN(anoInformado) && anoInformado >= 2016 && anoInformado <= new Date().getFullYear();
    let createdAt = anoValido ? new Date(new Date().setFullYear(anoInformado)) : Date.now();

    let newParticipante = new participanteSchema({
      nome: req.body.nome
      ,cpf: splita(req.body.cpf)
      ,createdAt: createdAt
    });

    if (req.body.eventos !== undefined) {
      let myArray = req.body.eventos;
      myArray.forEach(function (value, i) {
        let newEvento = ({
          tipo: value.tipo
          ,titulo: value.titulo
          ,cargaHoraria: value.cargaHoraria
        });
        newParticipante.eventos.push(newEvento);
      });
    }

    newParticipante.save((err, data) => {
      if (err) { console.error('Erro ao criar participante', err); return; }
      console.log(data);
    });
    res.send('success');
  } catch (error) {
    console.log('findOne error--> ${error}'); //Mostra onde o erro acontece e em seguida o erro em si
  }
});

router.get('/mostraParticipante', miPermiso("3","2"), (req, res) => { 
  try {
    participanteSchema.find((err, usr) => {
      if (err) { console.error('Erro ao mostrar participante', err); return; }
      res.send(usr);
    });
  } catch (error) {
    console.log('findOne error--> ${error}');
  }
});

router.put('/removeParticipante', miPermiso("3"), (req, res) => {
  try {
    let id = req.body.id;
    if (!idValido(id)) return res.status(400).send('ID inválido');
    participanteSchema.remove({"_id": id}, (err) => {
      if (err) { console.error('Erro ao remover participante', err); return; }
    });
    res.send('success');
  } catch (error) {
    console.log('findOne error--> ${error}'); // Alteração Lucas Ferreira
  }
});

//Mateus Roberto Algayer - 14/10/2021
//rota para cadastro de certificado
router.post('/postCertificado', (req, res) => {
  try {
    //quando cadastrar um novo certificado ele primeiro exclui o certificado do ano selecionado para depois criar um novo com o mesmo ano
    //isso existe pra caso seja necessário substituir o certificado de algum ano (Obs: mongo não tem problema com excluir o que não existe)
    CadastroMostraSchema.remove({"ano_certificado":req.body.data.ano_certificado}, (err) => {
      if (err) { console.error('Erro ao cadastrar certificado', err); return; }
      //Preenche o schema com as informações enviadas pelo body do request da adminAPIService para /postcertificado
        let novoCadastro = new cadastroMostraSchema({
          imagem: req.body.data.dataUrl,
          imagemFundo: req.body.data.dataUrlFundo,
          textoAvaliador: req.body.data.textoAvaliador,
          textoOrientador: req.body.data.textoOrientador,
          textoApresentacao: req.body.data.textoApresentacao,
          textoPremiado: req.body.data.textoPremiado,
          textoMencao: req.body.data.textoMencao,
          textoSaberes: req.body.data.textoSaberes,
          textoPOficinas: req.body.data.textoPOficinas,
          textoROficinas: req.body.data.textoROficinas,
          textoAcademica: req.body.data.textoAcademica,
          textoDocentes: req.body.data.textoDocentes,
          ano_certificado: req.body.data.ano_certificado
        });
        //envia o Schema para cMostra-controller para salvar os dados no banco

        //P.S.: o tratamento de erros da função abaixo está meio ruim, mas eu não sei como tratar decentemente :/
        cadastroMostra.createMostra(novoCadastro, (callback) => {});
        res.send('success');
    });
  } catch (error) {
    console.log('findOne error--> ${error}'); // Alteração Lucas Ferreira
  }
});

//Mateus Roberto Algayer - 14/10/2021
//rota para recuperar informações do certificado para AdminAPI
router.get('/getCertificados', (req, res) => {
  try {
    CadastroMostraSchema.find(function(err ,data){
      if (err) { console.error('Erro ao carregar informações do certificado', err); return; }
      res.status(200).send(data);
    });
  } catch (error) {
    console.log('findOne error--> ${error}'); // Alteração Lucas Ferreira
  }
});

//Leandro Henrique Kopp Ferreira - 14/10/2021
//rota para cadastrar os documentos
router.post('/postDocumento', (req, res) => {
  console.log(req.body.pacote.exibe);
  let novoCadastro = new CadastroDocumentoSchema({
    pdf: req.body.pacote.pdf,
    titulo: req.body.pacote.titulo,
    ano: req.body.pacote.ano,
    exibe: req.body.pacote.exibe,
  });
  CadastroDocumento.createDocumento(novoCadastro, (callback) => {});
  res.send('success');
});

//Leandro Henrique Kopp Ferreira - 14/10/2021
//rota para requisição dos documentos
router.get('/getDocumentos', (req, res) =>{
  try {
    CadastroDocumentoSchema.find(function(err ,data){
      if (err) { console.error('Erro ao mostrar certificados', err); return; }
      res.status(200).send(data);
    });
  } catch (error) {
    console.log('findOne error--> ${error}');
  }
});

//Leandro Henrique Kopp Ferreira - 04/11/2021
router.put('/putDocumento', miPermiso("3"), (req, res) => {
  try {
    let id = req.body.id;
    if (!idValido(id)) return res.status(400).send('ID inválido');
    CadastroDocumentoSchema.remove({"_id": id}, (err) => {
      if (err) { console.error('Erro ao mostrar certificados', err); return; }
    });
    res.send('success');
  } catch (error) {
    console.log('findOne error--> ${error}'); // Alteração Lucas Ferreira
  }
});

//Mateus Roberto Algayer - 24/11/2021
router.put('/putUpdateExibir', miPermiso("3"), (req, res) => {
  try {
  let id = req.body.id;
  let exibe = req.body.exibe;
  if (!idValido(id)) return res.status(400).send('ID inválido');

  CadastroDocumentoSchema.update({'_id': id},
                                 {$set:{'exibe': exibe}},
                                 {multi:false},
                                 (err) =>{
                                  if (err) { console.error('Erro ao editar documento', err); return; }
                                 });

  res.send('sucess');
                                } catch (error) {
                                  console.log('findOne error--> ${error}'); // Alteração Lucas Ferreira
                                }
});
      
router.put('/atualizaParticipante', miPermiso("3"), (req, res) => {
  try {
    var id = req.body.id;
    let nome = req.body.nome;
    let cpf = splita(req.body.cpf);
    if (!idValido(id)) return res.status(400).send('ID inválido');

    participanteSchema.findOneAndUpdate({"_id": id},{"$set": {"nome": nome, "cpf": cpf}, "$unset": {"eventos": ""}}, {new:true}, (err, doc) => {
        if (err) { console.error('Erro ao atualizar participante', err); return; }
      });

    if (req.body.eventos !== undefined) {
      let myArray = req.body.eventos;
      myArray.forEach(function (value, i) {
        var newEvento = ({
          tipo: value.tipo
          ,titulo: value.titulo
          ,cargaHoraria: value.cargaHoraria
        });

        participanteSchema.findOneAndUpdate({"_id": id},{"$push": {"eventos": newEvento}}, {new:true}, (err, doc) => {
          if (err) { console.error('Erro ao atualizar participante', err); return; }
        });
      });
    }
    res.send('success');
  } catch (error) {
    console.log('findOne error--> ${error}'); // Alteração Lucas Ferreira
  }
});

router.post('/registroSaberes', miPermiso("3","2"), (req, res) => {
  let newSaberes = new SaberesSchema({
    tipo: req.body.tipo,
    nome: req.body.nome,
    email: req.body.email,
    cpf: splita(req.body.cpf),
    telefone: splita(req.body.telefone),
    escola: req.body.escola,
    resumo: req.body.resumo,
    createdAt: Date.now()
  });
  Saberes.createSaberes(newSaberes, (callback) => {});
  res.send('success');
});

router.get('/mostraCPFparticipantes', miPermiso("3"), (req, res) => {
  participanteSchema.find({},'cpf -_id', (error, cpfs) => {
    if(error) {
      return res.status(400).send({msg:"error occurred - "+error});
    } else {
    return res.status(200).send(cpfs);
    }
  });
});


router.put('/setPresencaProjetos', miPermiso("3"), (req, res) => {
  try {
    let myArray0 = req.body.integrantesPresentes;
    let myArray1 = req.body.integrantesAusentes;

    for (var i = 0; i < myArray0.length; i++) {
      let id_integ = myArray0[i];
      projetoSchema.findOneAndUpdate({"integrantes._id": id_integ},
      {"$set": {"integrantes.$.presenca": true}}, {new:true},
      (err, doc) => {
        if (err) { console.error('Erro ao mostrar presença do projeto', err); return; }
      }
    );
    }
    for (var i = 0; i < myArray1.length; i++) {
      let id_integ = myArray1[i];
      projetoSchema.findOneAndUpdate({"integrantes._id": id_integ},
      {"$unset": {"integrantes.$.presenca": true}}, {new:true},
      (err, doc) => {
        if (err) { console.error('Erro ao mostrar presença do projeto', err); return; }
      }
    );
    }
    console.log("log antes de sucesso presença");
    res.send('success');
  } catch (error) {
    console.log('findOne error--> ${error}'); // Alteração Lucas Ferreira
  }
});

router.put('/setPremiadoProjetos', miPermiso("3"), (req, res) => {
  try {
    let premiacao = req.body;
    if(premiacao.premiacao === 'Premiado'){
    if(premiacao.colocacao === undefined){premiacao.colocacao = null;}
    projetoSchema.findOneAndUpdate({'_id':premiacao._id},{$set:{"premiacao":premiacao.premiacao,"colocacao":premiacao.colocacao,"feirasClassificadas":premiacao.feirasClassificadas}},{new:true}, (err, doc) =>{
      if (err) { console.error('Erro ao atribuir premiação', err); return; }
    });
    } else if(premiacao.premiacao === 'Mencao_honrosa'){
    projetoSchema.findOneAndUpdate({'_id':premiacao._id},{$set:{"premiacao":premiacao.premiacao,"colocacao":null,"feirasClassificadas":premiacao.feirasClassificadas}},{new:true}, (err, doc) =>{
      if (err) { console.error('Erro ao atribuir premiação', err); return; }
    });
    } else if(premiacao.premiacao === '') {
    projetoSchema.findOneAndUpdate({'_id':premiacao._id},{$unset:{"premiacao":"","colocacao":"","feirasClassificadas":"", "token":""}}, (err, doc) =>{
      if (err) { console.error('Erro ao atribuir premiação', err); return; }
    });
    } else {
    // Projeto sem Premiação/Menção Honrosa marcada (premiacao.premiacao vazio/undefined) ainda
    // pode ter sido classificado pra uma ou mais feiras - esses dois conceitos são independentes
    // (ver details.premiacao.html), então salva a classificação mesmo sem prêmio.
    projetoSchema.findOneAndUpdate({'_id':premiacao._id},{$set:{"feirasClassificadas":premiacao.feirasClassificadas}},{new:true}, (err, doc) =>{
      if (err) { console.error('Erro ao atribuir premiação', err); return; }
    });
    }
    res.send('success');
  } catch (error) {
    console.log('findOne error--> ${error}'); // Alteração Lucas Ferreira
  }
});

router.post('/edit', miPermiso("3"), (req, res) => {
	try {
    let obj = {
      ano: req.body[0].ano,
      mes: req.body[0].mes,
      dias: req.body[0].dias,
      edicao: req.body[0].edicao,
      text: req.body[0].text,
      saberes_docentes: req.body[0].saberes_docentes,
      prazoProjetos: req.body[0].prazoProjetos,
      prazoAvaliadores: req.body[0].prazoAvaliadores,
      botoes: req.body[0].botoes,
      destaques: req.body[0].destaques
    };
    adminSchema.findOneAndUpdate({'username':'admin2'},{$set:{'dias':obj.dias,'mes':obj.mes,'ano':obj.ano,'edicao':obj.edicao,'text':obj.text,'saberes_docentes':obj.saberes_docentes,'prazoProjetos':obj.prazoProjetos,'prazoAvaliadores':obj.prazoAvaliadores,'botoes':obj.botoes,'destaques':obj.destaques}}, [{new:true}], (err, usr) =>{
      if (err) { console.error('Erro ao editar', err); return; }
      else {
        res.send('success');	
      }
    })
  } catch (error) {
    console.log('findOne error--> ${error}'); // Alteração Lucas Ferreira
  }
});

router.get('/editar', (req, res) => {
	Admin.getEdicaoAtual((err, usr) => {
		if (err || !usr) return res.sendStatus(500);
		res.send(usr);
	});
});

router.post('/setOpcoes', miPermiso("3"), (req, res) => {
	try {
    let obj = req.body;
    console.log("OBJ:"+JSON.stringify(obj));	
    adminSchema.findOneAndUpdate({'username':'admin2'},{$set:{'opcoes':obj}}, {new:true}, (err, usr) =>{
      if (err) { console.error('Erro ao editar', err); return; }
      else res.send('success');		
    })
  } catch (error) {
    console.log('findOne error--> ${error}'); // Alteração Lucas Ferreira
  }
});

router.get('/getOpcoes', (req, res) => {
	Admin.getOpcoesAtuais((err, usr) => {
		if (err || !usr || !usr[0]) return res.sendStatus(500);
		res.send(usr[0].opcoes);
	});
});

router.get('/projetos', miPermiso("2","3"), (req, res) => {
  try {
    // Antes mandava o documento inteiro pro navegador, incluindo o hash da senha de
    // TODOS os 957 projetos — em toda tentativa de listar/avaliar/rankear projetos no
    // painel. Nenhuma tela do admin usa esse campo; só exclui.
    projetoSchema.find({}, '-password', (err, usr) => {
      if (err) { console.error('Erro em projetos', err); return; }
      res.send(usr);
    });
  } catch (error) {
    console.log('findOne error--> ${error}'); // Alteração Lucas Ferreira
  }
});

router.post('/avaliador', miPermiso("2","3"), (req, res) => {
  try {
    avaliadorSchema.find((err, usr) => {
      if (err) { console.error('Erro em avaliador', err); return; }
      res.send(usr);
    });
  } catch (error) {
    console.log('findOne error--> ${error}'); // Alteração Lucas Ferreira
  }
});

router.post('/saberes', miPermiso("2","3"), (req, res) => {
  try {
    saberesSchema.find((err, usr) => {
      if (err) { console.error('Erro em saberes docentes', err); return; }
      res.send(usr);
    });
  } catch (error) {
    console.log('findOne error--> ${error}'); // Alteração Lucas Ferreira
  }
});

router.put('/upgreice', ensureAuthenticated, miPermiso("3"), (req, res) => {
  try {
  let myArray0 = req.body.projetosAprovados;
  let myArray1 = req.body.projetosReprovados;
  
  for (var i = 0; i < myArray0.length; i++) {
    let id_doc = myArray0[i];

    projetoSchema.findOneAndUpdate({"_id": id_doc},
    {"$set": {"aprovado": true}}, {new:true},
    (err, doc) => {
      if (err) { console.error('Erro', err); return; }
    }
  );
  }

  for (var i = 0; i < myArray1.length; i++) {
    let id_doc = myArray1[i];
    projetoSchema.findOneAndUpdate({"_id": id_doc},
    {"$unset": {"aprovado": true}}, {new:true},
    (err, doc) => {
      if (err) { console.error('Erro', err); return; }
    });
  }
res.send('success');
  } catch (error) {
    console.log('findOne error--> ${error}'); // Alteração Lucas Ferreira
  }
});

router.put('/upgreiceAvaliadores', ensureAuthenticated, miPermiso("3"), (req, res) => {
  try {
      let myArray0 = req.body.avaliadoresMarcados;
      let myArray1 = req.body.avaliadoresNMarcados;
      
      for (var i = 0; i < myArray0.length; i++) {
        let id_doc = myArray0[i];
        avaliadorSchema.findOneAndUpdate({"_id": id_doc},
        {"$set": {"avaliacao": true}}, {new:true},
        (err, doc) => {
          if (err) { console.error('Erro na avaliação', err); return; }
        }
      );
      }

      for (var i = 0; i < myArray1.length; i++) {
        let id_doc = myArray1[i];
        avaliadorSchema.findOneAndUpdate({"_id": id_doc},
        {"$unset": {"avaliacao": true}}, {new:true},
        (err, doc) => {
          if (err) { console.error('Erro na avaliação', err); return; }
        });
      }
    res.send('success');
  } catch (error) {
    console.log('findOne error--> ${error}'); // Alteração Lucas Ferreira
  }
});


router.put('/update', ensureAuthenticated, miPermiso("3"), (req, res) => {
  try {
    if (req.body.cep !== undefined){
      req.body.cep = splita(req.body.cep);
    }
    let id = req.body._id;
    if (!idValido(id)) return res.status(400).send('ID inválido');
    let newProject = filtrarCamposEditaveis(req.body);

    console.log(newProject);

    projetoSchema.update({'_id':id}, {$set:newProject, updatedAt: Date.now()}, {upsert:true,new: true}, (err,docs) => {
      if (err) { console.error('Erro ao editar', err); return; }
      res.status(200).json(docs);
    });
  } catch (error) {
    console.log('findOne error--> ${error}'); // Alteração Lucas Ferreira
  }
});

router.put('/upgreiceEditProjeto', ensureAuthenticated, miPermiso("3"), (req, res) => {
  try {
    let myArray = req.body
    ,   id = req.body[0].ID;
    if (!idValido(id)) return res.status(400).send('ID inválido');

    myArray.forEach(function (value, i) {
      if (value._id !== undefined) {
    if (!idValido(value._id)) return;
    let id_subdoc = value._id,
    newIntegrante = ({
      _id: id_subdoc,
      tipo: value.tipo,
      nome: value.nome,
      email: value.email,
      cpf: splita(value.cpf),
      telefone: splita(value.telefone),
      tamCamiseta: value.tamCamiseta
    });
        projetoSchema.findOneAndUpdate({"_id": id,"integrantes._id": id_subdoc},
        {"$set": {"integrantes.$": newIntegrante, updatedAt: Date.now()}}, {new:true},
        (err, doc) => {
          if (err) { console.error('Erro ao editar projeto', err); return; }
        });	
      } else if (value._id === undefined) {
        let newIntegrante = ({
          tipo: value.tipo,
          nome: value.nome,
          email: value.email,
          cpf: splita(value.cpf),
          telefone: splita(value.telefone),
          tamCamiseta: value.tamCamiseta
        });

        projetoSchema.findOne({"_id": id}, (err, usr) => {
          if (err) { console.error('Erro ao editar projeto', err); return; }
          usr.integrantes.push(newIntegrante);
          usr.save((err, usr) => {
      if (err) { console.error('Erro ao editar projeto', err); return; }
          });
        });

        projetoSchema.update({_id: id}, {$set: {updatedAt: Date.now()}}, {upsert:true,new: true}, (err, docs) => {
          if (err) { console.error('Erro ao editar projeto', err); return; }
        });
      }
    });
    res.status(200).json(myArray);
  } catch (error) {
    console.log('findOne error--> ${error}'); // Alteração Lucas Ferreira
  }
});

router.put('/removerIntegrante', ensureAuthenticated, miPermiso("3"), (req, res) => {
  try {
    let id = req.body.integrantes_id;
    let ID = req.body.ID;
    if (!idValido(id) || !idValido(ID)) return res.status(400).send('ID inválido');

    projetoSchema.findOne({"integrantes._id": id}, (err, usr) => {
      if (err) { console.error('Erro ao remover integrante', err); return; }
      usr.integrantes.id(id).remove()
      usr.save((err, usr) => {
        if (err) { console.error('Erro ao remover integrante', err); return; }
      });
    });

    projetoSchema.update({_id:ID}, {$set: {updatedAt: Date.now()}}, {upsert:true,new: true}, (err,docs) => {
      if (err) { console.error('Erro ao remover integrante', err); return; }
      res.status(200).json(docs);
    });
  } catch (error) {
    console.log('findOne error--> ${error}'); // Alteração Lucas Ferreira
  }
});

router.put('/removeProjeto', miPermiso("3"), (req, res) => {
  try {
    let id = req.body.id;
    if (!idValido(id)) return res.status(400).send('ID inválido');
    projetoSchema.remove({"_id": id}, (err) => {
      if (err) { console.error('Erro ao remover projeto', err); return; }
    });
    res.send('success');
  } catch (error) {
    console.log('findOne error--> ${error}'); // Alteração Lucas Ferreira
  }
});

router.post('/aprovadosemail', miPermiso("3"), (req, res) => {
  var templatesDir = path.resolve(__dirname, '..', 'templates');
  var emailTemplates = require('email-templates');
  //var template = new EmailTemplate(path.join(templatesDir, 'redefinicao'));
  // Prepare nodemailer transport object

  emailTemplates(templatesDir, function(err, template) {

    if (err) {
      console.log(err);
    } else {

      var users = [];

      projetoSchema.find({"aprovado":true, "categoria":"Fundamental II (6º ao 9º anos)"}, function (err, docs) {
        if (err) { console.error(err); return; }
        //console.log(docs);
        docs.forEach(function(usr) {
          let url = "http://www.movaci.com.br/projetos/confirma/"+usr._id+"/2456";
          let url2 = "http://www.movaci.com.br/projetos/confirma/"+usr._id+"/9877";
          users.push({'email': usr.email, 'projeto': usr.nomeProjeto, 'url': url, 'url2': url2});
        });
        for (var i = 0; i < users.length; i++) {
          console.log(users[i]);
        }

        const transporter = nodemailer.createTransport(smtpTransport({
          host: 'smtp.zoho.com',
          port: 587,
          auth: {
            user: "no-reply4@movaci.com.br",
            pass: process.env.SMTP_ZOHO_PASS
          },
          getSocket: true
        }));

        var Render = function(locals) {
          this.locals = locals;
          this.send = function(err, html, text) {
            if (err) {
              console.log(err);
            } else {

              transporter.sendMail({
                from: 'no-reply4@movaci.com.br',
                to: locals.email,
                subject: 'MOVACI - Projeto aprovado!',
                html: html,
                text: text

              }, function(err, responseStatus) {
                if (err) {
                  console.log(err);
                } else {
                  console.log(responseStatus.message);
                }
              });
            }
          };
          this.batch = function(batch) {
            batch(this.locals, templatesDir, this.send);
          };
        };

        // Load the template and send the emails
        template('rateada', true, function(err, batch) {
          for(var user in users) {
            var render = new Render(users[user]);
            render.batch(batch);
          };
        });
        res.send('ok');
      });
    };
  });
});

router.post('/reprovadosemail', miPermiso("3"), (req, res) => {
  var templatesDir = path.resolve(__dirname, '..', 'templates');
  var emailTemplates = require('email-templates');
  //var template = new EmailTemplate(path.join(templatesDir, 'redefinicao'));
  // Prepare nodemailer transport object

  emailTemplates(templatesDir, function(err, template) {

    if (err) {
      console.log(err);
    } else {

      var users = [];

      projetoSchema.find({"aprovado":undefined, "categoria":"Ensino Médio, Técnico e Superior", "eixo":"Ciências Humanas e suas tecnologias"}, function (err, docs) {
        if (err) { console.error(err); return; }
        //console.log(docs);
        docs.forEach(function(usr) {
          users.push({'email':usr.email ,'projeto': usr.nomeProjeto});
        });
        for (var i = 0; i < users.length; i++) {
          console.log(users[i]);
        }

        const transporter = nodemailer.createTransport(smtpTransport({
          host: 'smtp.zoho.com',
          port: 587,
          auth: {
            user: "contato@movaci.com.br",
            pass: process.env.SMTP_ZOHO_PASS
          },
          getSocket: true
        }));

        var Render = function(locals) {
          this.locals = locals;
          this.send = function(err, html, text) {
            if (err) {
              console.log(err);
            } else {

              transporter.sendMail({
                from: 'contato@movaci.com.br',
                to: locals.email,
                subject: 'MOVACI - Seleção dos projetos',
                html: html,
                text: text

              }, function(err, responseStatus) {
                if (err) {
                  console.log(err);
                } else {
                  console.log(responseStatus.message);
                }
              });
            }
          };
          this.batch = function(batch) {
            batch(this.locals, templatesDir, this.send);
          };
        };

        // Load the template and send the emails
        template('confirmacao_nao', true, function(err, batch) {
          for(var user in users) {
            var render = new Render(users[user]);
            render.batch(batch);
          };
        });
        res.send('ok');
      });
    };
  });
});


router.post('/emailUpload', miPermiso("3"), (req, res) => {
  var templatesDir = path.resolve(__dirname, '..', 'templates');
  var emailTemplates = require('email-templates');
  //var template = new EmailTemplate(path.join(templatesDir, 'redefinicao'));
  // Prepare nodemailer transport object

  emailTemplates(templatesDir, function(err, template) {

    if (err) {
      console.log(err);
    } else {

      var users = [];

      projetoSchema.find({"aprovado":true, "categoria":"Ensino Médio, Técnico e Superior", "eixo":"Ciências Humanas e suas tecnologias"}, function (err, docs) {
        if (err) { console.error(err); return; }
        //console.log(docs);
        docs.forEach(function(usr) {
          users.push({'email':usr.email});
        });

        const transporter = nodemailer.createTransport(smtpTransport({
          host: 'smtp.zoho.com',
          port: 587,
          auth: {
            user: "no-reply5@movaci.com.br",
            pass: process.env.SMTP_ZOHO_PASS
          },
          getSocket: true
        }));

        var Render = function(locals) {
          this.locals = locals;
          this.send = function(err, html, text) {
            if (err) {
              console.log(err);
            } else {

              transporter.sendMail({
                from: 'no-reply5@movaci.com.br',
                to: locals.email,
                subject: 'MOVACI 2016 - IMPORTANTE! Relatório',
                html: html,
                text: text

              }, function(err, responseStatus) {
                if (err) {
                  console.log(err);
                } else {
                  console.log(responseStatus.message);
                }
              });
            }
          };
          this.batch = function(batch) {
            batch(this.locals, templatesDir, this.send);
          };
        };

        // Load the template and send the emails
        template('upload', true, function(err, batch) {
          for(var user in users) {
            var render = new Render(users[user]);
            render.batch(batch);
          };
        });
        res.send('ok');
      });
    };
  });
});

router.get('/camisetas', miPermiso("3"), (req, res) => {
  var myDoc = new pdf;
  let cont = 0;
  myDoc.pipe(fs.createWriteStream('camisetasMedio.pdf'));
  myDoc
  .image('public/assets/images/logo.png',70, 55, { fit: [200,350] })
  .fontSize(16)
  .moveDown(4)
  .text("Relação das camisetas - Ensino Médio, Técnico e Superior", {align: 'center'})
  .moveDown(2)
  .fontSize(12)

  // saberesSchema.find({}).sort({"nome":1}).exec((err, usr) => {Fundamental II (6º ao 9º anos)
  projetoSchema.find({"participa":true,"categoria":"Ensino Médio, Técnico e Superior"}).sort({"eixo":1, "nomeProjeto":1}).exec((err, usr) => {
    if (err) { console.error(err); return; }
    let echu = "";
    let cont = 0;
    for (let user in usr) {
      // cont ++;
      // console.log(usr[user].nomeProjeto);
      if (usr[user].eixo !== echu) {
        echu = usr[user].eixo;
        myDoc.fontSize(14)
        .text(usr[user].eixo, {align: 'center'})
        .moveDown(1)
      }

      myDoc
      .text(cont+". "+usr[user].nomeProjeto)
      .moveDown(0.1)
      .text("  Participa: "+usr[user].participa)
      .moveDown(0.1)
      .text("  Escola: "+usr[user].nomeEscola)
      .moveDown(0.1)
      .text("  Integrantes: ")
      .moveDown(0.1)

      // let af = usr[user].integrantes.length;
      // console.log(af);

      // console.log(usr[user].integrantes[0]);


      usr[user].integrantes.forEach (function(integ) {
        // console.log(integ.nome);
        if (integ.tipo === "Orientador") {
          cont ++;
          console.log(cont);
        }
        if (integ.tipo !== undefined){
          myDoc.text("     "+integ.nome+ " | Tam. "+integ.tamCamiseta);
        }
      });

      // if (usr[user].integrantes[0].tipo !== undefined){
      //   myDoc.text("     "+usr[user].integrantes[0].nome+ " | Tam. "+usr[user].integrantes[0].tamCamiseta);
      // }
      // if (usr[user].integrantes[1].tipo !== undefined){
      //   myDoc.text("     "+usr[user].integrantes[1].nome+ " | Tam. "+usr[user].integrantes[1].tamCamiseta);
      // }
      // if (usr[user].integrantes[2].tipo !== undefined){
      //   myDoc.text("     "+usr[user].integrantes[2].nome+ " | Tam. "+usr[user].integrantes[2].tamCamiseta);
      // }
      // if (usr[user].integrantes[3].tipo !== undefined){
      //   myDoc.text("     "+usr[user].integrantes[3].nome+ " | Tam. "+usr[user].integrantes[3].tamCamiseta);
      // }
      // if (usr[user].integrantes[4].tipo !== undefined){
      //   myDoc.text("     "+usr[user].integrantes[4].nome+ " | Tam. "+usr[user].integrantes[4].tamCamiseta);
      // }
      myDoc.moveDown(2)
    }
    myDoc.end();
  });
  res.sendStatus(200);
});

router.post('/pdf2', miPermiso("3"), (req, res) => {

  var myDoc = new pdf;

  myDoc.pipe(fs.createWriteStream('relacaoCamisetas.pdf'));

  myDoc
  .image('public/assets/images/logo.png',70, 55, { fit: [200,350] })
  .fontSize(20)
  .moveDown(2.5)
  .text("Relação camisetas", {align: 'center'})
  .fontSize(14)
  .moveDown(2.5)
  .text("FUNDAMENTAL I (1° ao 5° ano)", {align: 'center'})
  .moveDown(1)

  projetoSchema.find({"aprovado":true,"categoria":"Fundamental I (1º ao 5º anos)"}).sort({"eixo":1, "nomeProjeto":1}).exec((err, user) => {
    if (err) { console.error(err); return; }
    // let echu = "";

    for (i in user) {
      console.log(user[i].nomeProjeto);
    }

    // for (let usr in user) {


    //   if (user[usr].eixo !== echu) {
    //     echu = user[usr].eixo;
    //     myDoc.fontSize(14)
    //     .text("Eixo: "+user[usr].eixo, {align: 'center'})
    //   }

    //   myDoc.fontSize(12)
    //   .moveDown(1)
    //   .text("Projeto: "+user[usr].nomeProjeto)
    //   .moveDown(0.5)
    //   // .text("Orientador(es): ");

    //   if (user[usr].integrantes[0].tipo !== undefined){
    //     myDoc.text("     Nome: "+user[usr].integrantes[0].nome+ " | Tam. "+user[usr].integrantes[0].tamCamiseta);
    //   }

    //   if (user[usr].integrantes[1].tipo !== undefined){
    //     myDoc.moveDown(0.5)
    //     myDoc.text("     Nome: "+user[usr].integrantes[1].nome+ " | Tam. "+user[usr].integrantes[1].tamCamiseta);
    //   }

    //   if (user[usr].integrantes[2].tipo !== undefined){
    //     myDoc.moveDown(0.5)
    //     myDoc.text("     Nome: "+user[usr].integrantes[2].nome+ " | Tam. "+user[usr].integrantes[2].tamCamiseta);
    //   }

    //   if (user[usr].integrantes[3].tipo !== undefined){
    //     myDoc.moveDown(0.5)
    //     myDoc.text("     Nome: "+user[usr].integrantes[3].nome+ " | Tam. "+user[usr].integrantes[3].tamCamiseta);
    //   }

    //   if (user[usr].integrantes[4].tipo !== undefined){
    //     myDoc.moveDown(0.5)
    //     myDoc.text("     Nome: "+user[usr].integrantes[4].nome+ " | Tam. "+user[usr].integrantes[4].tamCamiseta);
    //   }
    // }
    myDoc.end();
  });

  res.sendStatus(200);
});

module.exports = router;
