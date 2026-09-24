'use strict';

const express = require('express')
, router = express.Router()
, Admin = require('../controllers/admin-controller')
, Saberes = require('../controllers/saberes-controller')
, adminSchema = require('../models/admin-schema')
, projetoSchema = require('../models/projeto-schema')
, eventoSchema = require('../models/evento-schema')
, feiraSchema = require('../models/feira-schema')
, escolaSchema = require('../models/escola-schema')
, participanteSchema = require('../models/participante-schema')
, emailHistoricoSchema = require('../models/email-historico-schema')
, CadastroMostraSchema = require('../models/cMostra-schema')
, CadastroDocumentoSchema = require('../models/documento-schema')
, nodemailer = require('nodemailer')
, avaliadorSchema = require('../models/avaliador-schema')
, AvaliadorController = require('../controllers/avaliador-controller')
, saberesSchema = require('../models/saberes-schema')
, cadastroMostraSchema = require('../models/cMostra-schema')
, cadastroMostra = require('../controllers/cMostra-controller')
, CadastroDocumento = require('../controllers/documento-controller')
, pdf = require('pdfkit')
, fs = require('fs')
, path = require('path')
, archiver = require('archiver')
, async = require('async')
, documentoValidator = require('../utils/documentoValidator');

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
// username/email ficavam de fora (copiado de routes/projetos.js, que por segurança não
// deixa o próprio projeto trocar essas duas) - mas a aba "Conta Usuário" desta tela manda
// justamente username/email, então sem elas aqui a gravação nunca fazia nada (newProject
// saía vazio, só updatedAt mudava, sem erro nenhum pro admin perceber). escola é o vínculo
// com a coleção Escola (ver models/escola-schema.js) - sem ele, selecionar uma escola na
// aba Instituição nunca persistia, só o nomeEscola de texto livre.
const CAMPOS_EDITAVEIS_PROJETO = ['nomeProjeto', 'categoria', 'eixo', 'participa', 'resumo', 'palavraChave', 'estado', 'cidade', 'cep', 'hospedagem', 'username', 'email', 'escola', 'nomeEscola'];

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

router.post('/criarEvento', miPermiso("3"), async (req, res) => {
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

    let data = await newEvento.save();
    console.log(data);
    res.send('success');
  } catch (error){
    console.error('Erro ao criar um evento', error);
  }
});

router.get('/mostraEvento', miPermiso("3","2"), async (req, res) => {
  try {
    let usr = await eventoSchema.find();
    res.send(usr);
  } catch (error){
    console.error('Erro ao mostrar evento', error);
  }
});

router.put('/removeEvento', miPermiso("3"), async (req, res) => {
  try {
    let id = req.body.id;
    if (!idValido(id)) return res.status(400).send('ID inválido');
    await eventoSchema.deleteOne({"_id": id});
    res.send('success');
  } catch (error){
    console.error('Erro ao remover evento', error);
  }
});

// Antes só dava pra apagar um evento e recriar do zero. Casa responsável enviado por cpf
// com um responsável já existente no evento (por cpf, já sem pontuação) e REAPROVEITA o
// subdocumento dele (mesmo _id, mesmo array "certificados") - só troca o nome. Um
// responsável cujo cpf não bate com nenhum já existente vira um subdocumento novo (sem
// certificado emitido ainda). Sem isso, reescrever o array inteiro trocaria o _id de todo
// mundo e quebraria o link de quem já baixou certificado de responsável desse evento
// (o token de validação é achado por responsavel._id, não por cpf).
router.put('/atualizaEvento', miPermiso("3"), async (req, res) => {
  try {
    let id = req.body.id;
    if (!idValido(id)) return res.status(400).send('ID inválido');

    let evt = await eventoSchema.findOne({"_id": id});
    if (!evt) return res.status(404).send('Evento não encontrado');

    let responsaveisAtuais = evt.responsavel || [];
    let responsaveisNovos = (req.body.responsavel || []).map((r) => {
      let cpfLimpo = splita(r.cpf);
      let existente = responsaveisAtuais.find((ra) => ra.cpf === cpfLimpo);
      if (existente) {
        existente.nome = r.nome;
        return existente;
      }
      return { nome: r.nome, cpf: cpfLimpo };
    });

    evt.tipo = req.body.tipo;
    evt.titulo = req.body.titulo;
    evt.cargaHoraria = req.body.cargaHoraria;
    evt.data = req.body.data;
    evt.responsavel = responsaveisNovos;

    let doc = await evt.save();
    res.status(200).json(doc);
  } catch (error){
    console.error('Erro ao atualizar evento', error);
    res.status(500).send('Falha ao atualizar evento');
  }
});

// Feiras externas (Mostratec, Mostratec Júnior, MOCITEC, etc) para as quais um projeto pode
// ser classificado - cadastradas por ano, com as categorias às quais se aplicam e o texto do
// certificado de classificação (ver premiacao.html/details.premiacao.html e getFeirasInfo).
router.post('/criarFeira', miPermiso("3"), async (req, res) => {
  try {
    // Link de inscrição (slug) precisa ser único entre edições - diferente do "ano" (que
    // pode se repetir de propósito, ver memória project-mostra-ano-nao-unico), um slug
    // repetido faria duas Mostras disputarem a mesma URL de inscrição.
    if (req.body.tipo === 'edicao' && req.body.slug) {
      let existente = await feiraSchema.findOne({ tipo: 'edicao', slug: req.body.slug });
      if (existente) return res.status(400).send('Já existe uma Mostra usando esse link de inscrição.');
    }

    let newFeira = new feiraSchema({
      nome: req.body.nome,
      categorias: req.body.categorias,
      textoCertificado: req.body.textoCertificado,
      ano: req.body.ano,
      createdAt: req.body.createdAt,
      tipo: req.body.tipo,
      categoriasEixos: req.body.categoriasEixos,
      diasAvaliacao: req.body.diasAvaliacao,
      numAvaliadoresPorProjeto: req.body.numAvaliadoresPorProjeto,
      slug: req.body.slug,
      prazoProjetos: req.body.prazoProjetos,
      prazoAvaliadores: req.body.prazoAvaliadores
    });
    await newFeira.save();
    res.send('success');
  } catch (error){
    console.error('Erro ao criar feira', error);
    res.status(500).send('Erro ao criar feira');
  }
});

router.put('/editarFeira', miPermiso("3"), async (req, res) => {
  try {
    let id = req.body.id;
    if (!idValido(id)) return res.status(400).send('ID inválido');

    if (req.body.tipo === 'edicao' && req.body.slug) {
      let existente = await feiraSchema.findOne({ tipo: 'edicao', slug: req.body.slug, _id: { $ne: id } });
      if (existente) return res.status(400).send('Já existe uma Mostra usando esse link de inscrição.');
    }

    // Bug real encontrado ao testar esta migração (não é regressão daqui): o objeto de
    // update sempre incluiu TODOS os campos, mesmo os que só fazem sentido pra tipo:'edicao'
    // (numAvaliadoresPorProjeto etc) - quando ausentes do body (ex: editando uma Feira
    // tipo:'classificacao'), o valor era `undefined` e o Mongoose falhava o cast ao tentar
    // gravar. Antes isso não aparecia porque a rota respondia 'success' sem esperar o
    // update terminar (erro só ia pro log) - ou seja, editar uma Feira de classificação
    // NUNCA salvava de verdade. Filtra os campos ausentes antes de mandar pro update.
    let camposFeira = {
      nome: req.body.nome,
      categorias: req.body.categorias,
      textoCertificado: req.body.textoCertificado,
      tipo: req.body.tipo,
      categoriasEixos: req.body.categoriasEixos,
      diasAvaliacao: req.body.diasAvaliacao,
      numAvaliadoresPorProjeto: req.body.numAvaliadoresPorProjeto,
      slug: req.body.slug,
      prazoProjetos: req.body.prazoProjetos,
      prazoAvaliadores: req.body.prazoAvaliadores
    };
    Object.keys(camposFeira).forEach((k) => { if (camposFeira[k] === undefined) delete camposFeira[k]; });
    await feiraSchema.findOneAndUpdate({'_id': id}, camposFeira);
    res.send('success');
  } catch (error){
    console.error('Erro ao editar feira', error);
    res.status(500).send('Erro ao editar feira');
  }
});

router.get('/mostraFeiras', miPermiso("3","2"), async (req, res) => {
  try {
    let usr = await feiraSchema.find();
    res.send(usr);
  } catch (error){
    console.error('Erro ao mostrar feiras', error);
  }
});

router.put('/removeFeira', miPermiso("3"), async (req, res) => {
  try {
    let id = req.body.id;
    if (!idValido(id)) return res.status(400).send('ID inválido');
    await feiraSchema.deleteOne({"_id": id});
    res.send('success');
  } catch (error){
    console.error('Erro ao remover feira', error);
  }
});

// Cadastro formal de escolas (ver models/escola-schema.js) - substitui o texto livre
// que cada projeto digitava em nomeEscola. Criada pelo admin já sai "aprovada"; criada
// via solicitação pública (ver routes/index.js#solicitarEscola) sai "pendente" até o
// admin revisar/corrigir e aprovar.
router.post('/criarEscola', miPermiso("3"), async (req, res) => {
  try {
    let newEscola = new escolaSchema({
      nome: req.body.nome,
      cep: req.body.cep,
      cidade: req.body.cidade,
      estado: req.body.estado,
      status: 'aprovada',
      origem: 'admin',
      aprovadaEm: new Date(),
      aprovadaPor: req.user.username
    });
    let data = await newEscola.save();
    res.send(data);
  } catch (error){
    console.error('Erro ao criar escola', error);
    res.status(500).send('Erro ao criar escola');
  }
});

router.get('/mostraEscolas', miPermiso("3","2"), async (req, res) => {
  try {
    let usr = await escolaSchema.find().sort({ nome: 1 });
    res.send(usr);
  } catch (error){
    console.error('Erro ao mostrar escolas', error);
  }
});

// Avisa por e-mail quem solicitou o cadastro de uma escola se a solicitação foi
// aprovada ou recusada - falha de envio não derruba a aprovação/recusa em si (o
// dado já foi salvo), só fica registrada no log.
function avisarDecisaoEscola(escola, aprovada) {
  if (!escola.solicitanteEmail) return;
  var transport = nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 587,
    auth: { user: process.env.SMTP_GMAIL_USER, pass: process.env.SMTP_GMAIL_PASS }
  });
  var assunto = aprovada ? 'MOVACI - cadastro de escola aprovado' : 'MOVACI - cadastro de escola não aprovado';
  var corpo = '<p>Olá' + (escola.solicitanteNome ? ', ' + escola.solicitanteNome : '') + '!</p>' +
    '<p>Sua solicitação de cadastro da escola <b>' + escola.nome + '</b> foi <b>' + (aprovada ? 'aprovada' : 'recusada') + '</b>.</p>' +
    (escola.motivoDecisao ? '<p>' + escola.motivoDecisao + '</p>' : '') +
    (aprovada ? '<p>Ela já aparece na lista de seleção do cadastro de projetos.</p>' : '');
  transport.sendMail({
    from: 'MOVACI <va-movaci@ifsul.edu.br>',
    to: escola.solicitanteEmail,
    subject: assunto,
    html: corpo
  }, function(err) {
    if (err) console.error('Erro ao enviar e-mail de decisão de escola para ' + escola.solicitanteEmail, err);
  });
}

// Aprova uma escola pendente - permite corrigir nome/cep/cidade/estado no mesmo passo
// (a pessoa que solicitou pode ter digitado algo com erro/variação).
router.put('/aprovarEscola', miPermiso("3"), async (req, res) => {
  try {
    let id = req.body.id;
    if (!idValido(id)) return res.status(400).send('ID inválido');
    let data = await escolaSchema.findByIdAndUpdate(id, {
      nome: req.body.nome,
      cep: req.body.cep,
      cidade: req.body.cidade,
      estado: req.body.estado,
      status: 'aprovada',
      motivoDecisao: req.body.motivo,
      aprovadaEm: new Date(),
      aprovadaPor: req.user.username
    }, { returnDocument: 'after' });
    avisarDecisaoEscola(data, true);
    res.send(data);
  } catch (error){
    console.error('Erro ao aprovar escola', error);
    res.status(500).send('Erro ao aprovar escola');
  }
});

// Rejeita uma escola pendente - diferente de removeEscola (que só se aplica a uma
// escola JÁ aprovada e sem projeto vinculado), aqui é uma decisão sobre a
// solicitação em si, com motivo obrigatório (vai no e-mail de aviso).
router.put('/rejeitarEscola', miPermiso("3"), async (req, res) => {
  try {
    let id = req.body.id;
    if (!idValido(id)) return res.status(400).send('ID inválido');
    if (!req.body.motivo || !req.body.motivo.trim()) return res.status(400).send('Motivo é obrigatório');
    let data = await escolaSchema.findByIdAndUpdate(id, {
      status: 'rejeitada',
      motivoDecisao: req.body.motivo,
      aprovadaEm: new Date(),
      aprovadaPor: req.user.username
    }, { returnDocument: 'after' });
    avisarDecisaoEscola(data, false);
    res.send(data);
  } catch (error){
    console.error('Erro ao rejeitar escola', error);
    res.status(500).send('Erro ao rejeitar escola');
  }
});

router.put('/editarEscola', miPermiso("3"), async (req, res) => {
  try {
    let id = req.body.id;
    if (!idValido(id)) return res.status(400).send('ID inválido');
    let data = await escolaSchema.findByIdAndUpdate(id, {
      nome: req.body.nome,
      cep: req.body.cep,
      cidade: req.body.cidade,
      estado: req.body.estado
    }, { returnDocument: 'after' });
    res.send(data);
  } catch (error){
    console.error('Erro ao editar escola', error);
    res.status(500).send('Erro ao editar escola');
  }
});

// Recusa remover uma escola que ainda tem projeto vinculado - diferente de removeFeira,
// aqui a integridade importa mais: um projeto sem escola visível quebraria os
// relatórios/listas que dependem desse vínculo.
router.put('/removeEscola', miPermiso("3"), async (req, res) => {
  try {
    let id = req.body.id;
    if (!idValido(id)) return res.status(400).send('ID inválido');
    let projetos = await projetoSchema.find({ escola: id }, 'numInscricao nomeProjeto');
    if (projetos.length > 0) {
      const LIMITE_LISTADOS = 10;
      let nomes = projetos.slice(0, LIMITE_LISTADOS).map((p) => 'Nº ' + p.numInscricao + ' — ' + p.nomeProjeto).join('; ');
      if (projetos.length > LIMITE_LISTADOS) nomes += '; e mais ' + (projetos.length - LIMITE_LISTADOS) + '.';
      return res.status(409).send('Existem ' + projetos.length + ' projeto(s) vinculado(s) a essa escola - não é possível remover. ' + nomes);
    }
    await escolaSchema.deleteOne({"_id": id});
    res.send('success');
  } catch (error){
    console.error('Erro ao remover escola', error);
    res.status(500).send('Erro ao remover escola');
  }
});

router.get('/mostraAvaliadores', miPermiso("3","2"), async (req, res) => {
  try {
    let usr = await avaliadorSchema.find();
    res.send(usr);
  } catch (error){
    console.error('Erro ao mostrar avaliadores', error);
  }
});

router.put('/removeAvaliador', miPermiso("3"), async (req, res) => {
  try {
    let id = req.body.id;
    if (!idValido(id)) return res.status(400).send('ID inválido');
    await avaliadorSchema.deleteOne({"_id": id});
    res.send('success');
  } catch (error) {
    console.error('Erro ao remover avaliador', error);
    res.status(500).send('Erro ao remover avaliador');
  }
});

router.put('/atualizaAvaliador', miPermiso("3"), async (req, res) => {
  try {
    let id = req.body.id;
    if (!idValido(id)) return res.status(400).send('ID inválido');

    let checagem = AvaliadorController.validarDocumento(req.body.cpf);
    if (!checagem.valido) return res.status(400).send(checagem.mensagem);

    let checagemTelefone = AvaliadorController.validarTelefone(req.body.telefone);
    if (!checagemTelefone.valido) return res.status(400).send(checagemTelefone.mensagem);

    await avaliadorSchema.findOneAndUpdate({"_id": id}, {"$set": {
      "nome": req.body.nome,
      "email": req.body.email,
      "nacionalidade": req.body.nacionalidade,
      "cpf": splita(req.body.cpf),
      "rg": splita(req.body.rg),
      "dtNascimento": req.body.dtNascimento,
      "nivelAcademico": req.body.nivelAcademico,
      "categoriasEixos": Array.isArray(req.body.categoriasEixos) ? req.body.categoriasEixos : [],
      "categoriasEixosAvaliados": Array.isArray(req.body.categoriasEixosAvaliados) ? req.body.categoriasEixosAvaliados : [],
      "atuacaoProfissional": req.body.atuacaoProfissional,
      "tempoAtuacao": req.body.tempoAtuacao,
      "telefone": splita(req.body.telefone),
      "curriculo": req.body.curriculo,
      "disponibilidade": Array.isArray(req.body.disponibilidade) ? req.body.disponibilidade : []
    }}, {returnDocument: 'after'});
    res.send('success');
  } catch (error) {
    console.error('Erro ao atualizar avaliador', error);
    res.status(500).send('Erro ao atualizar avaliador');
  }
});

router.post('/criarParticipante', miPermiso("3"), async (req, res) => { //alteração Lucas A. Ferreira
  try {
    // E-mail é o identificador de login do participante (dashboard próprio) - exigido a
    // partir de agora pra todo cadastro novo, cadastros antigos sem e-mail só não conseguem
    // logar até o admin completar o dado.
    if (!req.body.email || !/^.+@.+\..+$/.test(req.body.email)) {
      return res.status(400).send('Informe um e-mail válido.');
    }

    let checagemDoc = documentoValidator.validarDocumento(req.body.cpf);
    if (!checagemDoc.valido) return res.status(400).send(checagemDoc.mensagem);

    // Mesmo esquema usado em /avaliadores/registro: permite cadastrar o participante em um
    // ano anterior usando o filtro de ano já existente na tela (ex: cadastro-participantes.html).
    let anoInformado = parseInt(req.body.ano, 10);
    let anoValido = !isNaN(anoInformado) && anoInformado >= 2016 && anoInformado <= new Date().getFullYear();
    let createdAt = anoValido ? new Date(new Date().setFullYear(anoInformado)) : Date.now();

    let newParticipante = new participanteSchema({
      nome: req.body.nome
      ,cpf: splita(req.body.cpf)
      ,email: req.body.email
      ,createdAt: createdAt
    });

    if (req.body.eventos !== undefined) {
      let myArray = req.body.eventos;
      myArray.forEach(function (value, i) {
        let newEvento = ({
          tipo: value.tipo
          ,titulo: value.titulo
          ,cargaHoraria: value.cargaHoraria
          ,data: value.data
        });
        newParticipante.eventos.push(newEvento);
      });
    }

    await newParticipante.save();
    res.send('success');
  } catch (error) {
    console.error('Erro ao criar participante', error);
    res.status(500).send('Erro ao criar participante');
  }
});

router.get('/mostraParticipante', miPermiso("3","2"), async (req, res) => {
  try {
    let usr = await participanteSchema.find();
    res.send(usr);
  } catch (error) {
    console.error('Erro ao mostrar participante', error);
  }
});

router.put('/removeParticipante', miPermiso("3"), async (req, res) => {
  try {
    let id = req.body.id;
    if (!idValido(id)) return res.status(400).send('ID inválido');
    await participanteSchema.deleteOne({"_id": id});
    res.send('success');
  } catch (error) {
    console.error('Erro ao remover participante', error);
    res.status(500).send('Erro ao remover participante');
  }
});

//Mateus Roberto Algayer - 14/10/2021
//rota para cadastro de certificado
router.post('/postCertificado', async (req, res) => {
  try {
    //quando cadastrar um novo certificado ele primeiro exclui o certificado do ano selecionado para depois criar um novo com o mesmo ano
    //isso existe pra caso seja necessário substituir o certificado de algum ano (Obs: mongo não tem problema com excluir o que não existe)
    await CadastroMostraSchema.deleteOne({"ano_certificado":req.body.data.ano_certificado});
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
      textoPPalestra: req.body.data.textoPPalestra,
      textoRPalestra: req.body.data.textoRPalestra,
      ano_certificado: req.body.data.ano_certificado
    });
    //envia o Schema para cMostra-controller para salvar os dados no banco
    await cadastroMostra.createMostra(novoCadastro);
    res.send('success');
  } catch (error) {
    console.error('Erro ao cadastrar certificado', error);
    res.status(500).send('Erro ao cadastrar certificado');
  }
});

//Mateus Roberto Algayer - 14/10/2021
//rota para recuperar informações do certificado para AdminAPI
router.get('/getCertificados', async (req, res) => {
  try {
    let data = await CadastroMostraSchema.find();
    res.status(200).send(data);
  } catch (error) {
    console.error('Erro ao carregar informações do certificado', error);
  }
});

//Leandro Henrique Kopp Ferreira - 14/10/2021
//rota para cadastrar os documentos
router.post('/postDocumento', async (req, res) => {
  console.log(req.body.pacote.exibe);
  let novoCadastro = new CadastroDocumentoSchema({
    pdf: req.body.pacote.pdf,
    titulo: req.body.pacote.titulo,
    ano: req.body.pacote.ano,
    exibe: req.body.pacote.exibe,
  });
  try {
    await CadastroDocumento.createDocumento(novoCadastro);
    res.send('success');
  } catch (error) {
    console.error('Erro ao cadastrar documento', error);
    res.status(500).send('Erro ao cadastrar documento');
  }
});

//Leandro Henrique Kopp Ferreira - 14/10/2021
//rota para requisição dos documentos
router.get('/getDocumentos', async (req, res) =>{
  try {
    let data = await CadastroDocumentoSchema.find();
    res.status(200).send(data);
  } catch (error) {
    console.error('Erro ao mostrar certificados', error);
  }
});

//Leandro Henrique Kopp Ferreira - 04/11/2021
router.put('/putDocumento', miPermiso("3"), async (req, res) => {
  try {
    let id = req.body.id;
    if (!idValido(id)) return res.status(400).send('ID inválido');
    await CadastroDocumentoSchema.deleteOne({"_id": id});
    res.send('success');
  } catch (error) {
    console.error('Erro ao remover documento', error);
    res.status(500).send('Erro ao remover documento');
  }
});

//Mateus Roberto Algayer - 24/11/2021
router.put('/putUpdateExibir', miPermiso("3"), async (req, res) => {
  try {
    let id = req.body.id;
    let exibe = req.body.exibe;
    if (!idValido(id)) return res.status(400).send('ID inválido');

    await CadastroDocumentoSchema.updateOne({'_id': id}, {$set:{'exibe': exibe}});
    res.send('sucess');
  } catch (error) {
    console.error('Erro ao editar documento', error);
    res.status(500).send('Erro ao editar documento');
  }
});
      
router.put('/atualizaParticipante', miPermiso("3"), async (req, res) => {
  try {
    var id = req.body.id;
    let nome = req.body.nome;
    let cpf = splita(req.body.cpf);
    let email = req.body.email;
    if (!idValido(id)) return res.status(400).send('ID inválido');
    if (!email || !/^.+@.+\..+$/.test(email)) return res.status(400).send('Informe um e-mail válido.');

    let checagemDoc = documentoValidator.validarDocumento(req.body.cpf);
    if (!checagemDoc.valido) return res.status(400).send(checagemDoc.mensagem);

    await participanteSchema.findOneAndUpdate({"_id": id},{"$set": {"nome": nome, "cpf": cpf, "email": email}, "$unset": {"eventos": ""}}, {returnDocument: 'after'});

    if (req.body.eventos !== undefined) {
      let myArray = req.body.eventos;
      for (let value of myArray) {
        var newEvento = ({
          tipo: value.tipo
          ,titulo: value.titulo
          ,cargaHoraria: value.cargaHoraria
          ,data: value.data
        });

        await participanteSchema.findOneAndUpdate({"_id": id},{"$push": {"eventos": newEvento}}, {returnDocument: 'after'});
      }
    }
    res.send('success');
  } catch (error) {
    console.error('Erro ao atualizar participante', error);
    res.status(500).send('Erro ao atualizar participante');
  }
});

router.post('/registroSaberes', miPermiso("3","2"), async (req, res) => {
  let checagemDoc = documentoValidator.validarDocumento(req.body.cpf);
  if (!checagemDoc.valido) return res.status(400).send(checagemDoc.mensagem);

  let checagemTelefone = documentoValidator.validarTelefone(req.body.telefone);
  if (!checagemTelefone.valido) return res.status(400).send(checagemTelefone.mensagem);

  // Bug pré-existente encontrado ao testar esta migração (não é regressão daqui): usava
  // "SaberesSchema" (maiúsculo), nunca importado neste arquivo (só "saberesSchema",
  // minúsculo) - todo POST aqui sempre lançava ReferenceError. Não há nenhuma tela do
  // admin que chame esta rota hoje (confirmado - dead route), então o bug nunca foi
  // percebido. Corrigida a grafia.
  let newSaberes = new saberesSchema({
    tipo: req.body.tipo,
    nome: req.body.nome,
    email: req.body.email,
    cpf: splita(req.body.cpf),
    telefone: splita(req.body.telefone),
    escola: req.body.escola,
    resumo: req.body.resumo,
    createdAt: Date.now()
  });
  try {
    await Saberes.createSaberes(newSaberes);
    res.send('success');
  } catch (error) {
    console.error('Erro ao registrar saberes docentes', error);
    res.status(500).send('Erro ao registrar saberes docentes');
  }
});

router.get('/mostraCPFparticipantes', miPermiso("3"), async (req, res) => {
  try {
    let cpfs = await participanteSchema.find({},'cpf -_id');
    return res.status(200).send(cpfs);
  } catch (error) {
    return res.status(400).send({msg:"error occurred - "+error});
  }
});


router.put('/setPresencaProjetos', miPermiso("3"), async (req, res) => {
  try {
    let myArray0 = req.body.integrantesPresentes;
    let myArray1 = req.body.integrantesAusentes;

    for (let id_integ of myArray0) {
      await projetoSchema.findOneAndUpdate({"integrantes._id": id_integ}, {"$set": {"integrantes.$.presenca": true}}, {returnDocument: 'after'});
    }
    for (let id_integ of myArray1) {
      await projetoSchema.findOneAndUpdate({"integrantes._id": id_integ}, {"$unset": {"integrantes.$.presenca": true}}, {returnDocument: 'after'});
    }
    res.send('success');
  } catch (error) {
    console.error('Erro ao definir presença dos projetos', error);
    res.status(500).send('Erro ao definir presença dos projetos');
  }
});

router.put('/setPremiadoProjetos', miPermiso("3"), async (req, res) => {
  try {
    let premiacao = req.body;
    if (premiacao.premiacao === 'Premiado') {
      if (premiacao.colocacao === undefined) { premiacao.colocacao = null; }
      await projetoSchema.findOneAndUpdate({'_id':premiacao._id},{$set:{"premiacao":premiacao.premiacao,"colocacao":premiacao.colocacao,"feirasClassificadas":premiacao.feirasClassificadas}},{returnDocument: 'after'});
    } else if (premiacao.premiacao === 'Mencao_honrosa') {
      await projetoSchema.findOneAndUpdate({'_id':premiacao._id},{$set:{"premiacao":premiacao.premiacao,"colocacao":null,"feirasClassificadas":premiacao.feirasClassificadas}},{returnDocument: 'after'});
    } else if (premiacao.premiacao === '') {
      await projetoSchema.findOneAndUpdate({'_id':premiacao._id},{$unset:{"premiacao":"","colocacao":"","feirasClassificadas":"", "token":""}});
    } else {
      // Projeto sem Premiação/Menção Honrosa marcada (premiacao.premiacao vazio/undefined) ainda
      // pode ter sido classificado pra uma ou mais feiras - esses dois conceitos são independentes
      // (ver details.premiacao.html), então salva a classificação mesmo sem prêmio.
      await projetoSchema.findOneAndUpdate({'_id':premiacao._id},{$set:{"feirasClassificadas":premiacao.feirasClassificadas}},{returnDocument: 'after'});
    }
    res.send('success');
  } catch (error) {
    console.error('Erro ao atribuir premiação', error);
    res.status(500).send('Erro ao atribuir premiação');
  }
});

router.post('/edit', miPermiso("3"), async (req, res) => {
	try {
    let obj = {
      ano: req.body[0].ano,
      mes: req.body[0].mes,
      dias: req.body[0].dias,
      edicao: req.body[0].edicao,
      text: req.body[0].text,
      saberes_docentes: req.body[0].saberes_docentes,
      solicitacao_escola: req.body[0].solicitacao_escola,
      prazoProjetos: req.body[0].prazoProjetos,
      prazoAvaliadores: req.body[0].prazoAvaliadores,
      botoes: req.body[0].botoes,
      destaques: req.body[0].destaques
    };
    await adminSchema.findOneAndUpdate({'username':'admin2'},{$set:{'dias':obj.dias,'mes':obj.mes,'ano':obj.ano,'edicao':obj.edicao,'text':obj.text,'saberes_docentes':obj.saberes_docentes,'solicitacao_escola':obj.solicitacao_escola,'prazoProjetos':obj.prazoProjetos,'prazoAvaliadores':obj.prazoAvaliadores,'botoes':obj.botoes,'destaques':obj.destaques}}, {returnDocument: 'after'});
    res.send('success');
  } catch (error) {
    console.error('Erro ao editar', error);
    res.status(500).send('Erro ao editar');
  }
});

router.get('/editar', (req, res) => {
	Admin.getEdicaoAtual((err, usr) => {
		if (err || !usr) return res.sendStatus(500);
		res.send(usr);
	});
});

router.post('/setOpcoes', miPermiso("3"), async (req, res) => {
	try {
    let obj = req.body;
    console.log("OBJ:"+JSON.stringify(obj));
    await adminSchema.findOneAndUpdate({'username':'admin2'},{$set:{'opcoes':obj}}, {returnDocument: 'after'});
    res.send('success');
  } catch (error) {
    console.error('Erro ao editar', error);
    res.status(500).send('Erro ao editar');
  }
});

router.get('/getOpcoes', (req, res) => {
	Admin.getOpcoesAtuais((err, usr) => {
		if (err || !usr || !usr[0]) return res.sendStatus(500);
		res.send(usr[0].opcoes);
	});
});

router.get('/projetos', miPermiso("2","3"), async (req, res) => {
  try {
    // Antes mandava o documento inteiro pro navegador, incluindo o hash da senha de
    // TODOS os 957 projetos — em toda tentativa de listar/avaliar/rankear projetos no
    // painel. Nenhuma tela do admin usa esse campo; só exclui.
    let usr = await projetoSchema.find({}, '-password');
    res.send(usr);
  } catch (error) {
    console.error('Erro em projetos', error);
  }
});

// Download em zip dos PDFs de relatório de projetos aprovados. Sempre restringe a
// aprovado:true no servidor, não importa o que vier em "ids" - a tela só manda pra cá o
// que está visível/filtrado no momento (ver public/admin/assets/js/controllers/projetosCtrl.js
// #baixarZip), mas a garantia de segurança real (nunca vazar relatório de projeto não
// aprovado) precisa estar aqui, não só confiar no que o cliente filtrou.
router.get('/projetos/relatorios.zip', miPermiso("3"), async (req, res) => {
  let filtro = { aprovado: true };

  if (req.query.ids) {
    let ids = req.query.ids.split(',').filter(idValido);
    if (ids.length === 0) return res.status(400).send('Nenhum ID válido informado.');
    filtro._id = { $in: ids };
  } else {
    let anoInformado = parseInt(req.query.ano, 10);
    if (!isNaN(anoInformado)) {
      filtro.createdAt = {
        $gte: new Date(anoInformado, 0, 1),
        $lt: new Date(anoInformado + 1, 0, 1)
      };
    }
  }

  let projetos;
  try {
    projetos = await projetoSchema.find(filtro, 'numInscricao nomeProjeto');
  } catch (err) {
    console.error('Erro ao buscar projetos pro zip', err);
    return res.status(500).send('Erro ao gerar o zip.');
  }

  let pastaRelatorios = path.join(__dirname, '..', 'public', 'relatorios');
  let encontrados = projetos.filter((p) => fs.existsSync(path.join(pastaRelatorios, p.numInscricao + '.pdf')));

  if (encontrados.length === 0) {
    return res.status(404).send('Nenhum relatório encontrado pros projetos selecionados.');
  }

  let anoZip = req.query.ano || new Date().getFullYear();
  res.attachment('projetos-aprovados-' + anoZip + '.zip');

  let archive = archiver('zip');
  archive.on('error', (err) => {
    console.error('Erro ao gerar zip de relatórios', err);
    if (!res.headersSent) res.status(500).send('Erro ao gerar o zip.');
  });
  archive.pipe(res);

  encontrados.forEach((p) => {
    // Sanitiza o nome do projeto pro nome do arquivo dentro do zip - troca só os
    // caracteres realmente inválidos em nome de arquivo (path traversal, etc.) por "_",
    // preservando acentos. Baseado em blocklist (não em \p{L}/\p{N} - o babel 6 usado
    // neste projeto não suporta Unicode property escapes, viraria lixo em produção).
    let nomeSanitizado = (p.nomeProjeto || '').replace(/[\/\\:*?"<>|]/g, '_').trim();
    archive.file(path.join(pastaRelatorios, p.numInscricao + '.pdf'), {
      name: p.numInscricao + '_' + nomeSanitizado + '.pdf'
    });
  });

  archive.finalize();
});

// Resolve os destinatários de um projeto para envio de e-mail em massa, conforme o
// tipo escolhido pelo admin (e-mail principal da conta, orientadores, alunos ou todos).
function _resolveDestinatarios(projeto, destinatario) {
  var camposProjeto = {
    nomeProjeto: projeto.nomeProjeto, categoria: projeto.categoria, eixo: projeto.eixo,
    numInscricao: projeto.numInscricao, nomeEscola: projeto.nomeEscola, estado: projeto.estado, cidade: projeto.cidade,
    // Só faz sentido pra quem foi marcado Premiado (Projetos > Premiação) - fica undefined
    // pros demais, e a máscara ¨colocacao some sem quebrar em /enviarEmailProjetos.
    colocacao: projeto.colocacao,
    // Booleanos só usados dentro de ¨SE(...) em /enviarEmailPremiados (ver _resolveCondicionais)
    // e ¨feiraNome, que só resolve o nome de verdade se a query fez populate('feirasClassificadas').
    premiado: projeto.premiacao === 'Premiado',
    mencaoHonrosa: projeto.premiacao === 'Mencao_honrosa',
    classificado: !!(projeto.feirasClassificadas && projeto.feirasClassificadas.length > 0),
    feiraNome: (projeto.feirasClassificadas || []).map(function(f) { return f && f.nome; }).filter(Boolean).join(', ')
  };
  if (destinatario === 'principal') {
    return projeto.email ? [Object.assign({ nome: projeto.nomeProjeto, email: projeto.email }, camposProjeto)] : [];
  }
  var tipos = destinatario === 'orientadores' ? ['Orientador'] : destinatario === 'alunos' ? ['Aluno'] : ['Orientador', 'Aluno'];
  return (projeto.integrantes || [])
    .filter(function(i) { return tipos.indexOf(i.tipo) !== -1 && i.email; })
    .map(function(i) { return Object.assign({ nome: i.nome, email: i.email }, camposProjeto); });
}

// Mesmo mecanismo de máscaras ¨chave usado nos textos de certificado (homeCtrl.js), só
// que rodando no servidor (substituição de uma passada só, em vez do while+replace do original).
function _aplicaMascaras(texto, dados) {
  return (texto || '').replace(/¨\w+/g, function(match) {
    var chave = match.slice(1);
    return dados[chave] !== undefined && dados[chave] !== null ? String(dados[chave]) : match;
  });
}

// Resolve ¨SE(condicao;seVerdadeiro;seFalso) escaneando parênteses na mão em vez de regex -
// os textos verdadeiro/falso podem ter parênteses de verdade (ex: nome de categoria), o que
// quebraria uma regex "não-gulosa" simples. Suporta ¨SE aninhado (resolvido por recursão).
// Mesma implementação do lado do cliente (enviarEmailPremiadosCtrl.js), só pra pré-visualização.
function _resolveCondicionais(texto, avaliarCondicao) {
  texto = texto || '';
  var resultado = '';
  var i = 0;
  while (i < texto.length) {
    var inicio = texto.indexOf('¨SE(', i);
    if (inicio === -1) { resultado += texto.slice(i); break; }
    resultado += texto.slice(i, inicio);
    var pos = inicio + 4;
    var profundidade = 1;
    var args = [];
    var argAtual = '';
    while (pos < texto.length && profundidade > 0) {
      var ch = texto[pos];
      if (ch === '(') { profundidade++; argAtual += ch; }
      else if (ch === ')') {
        profundidade--;
        if (profundidade === 0) break;
        argAtual += ch;
      } else if (ch === ';' && profundidade === 1 && args.length < 2) {
        args.push(argAtual);
        argAtual = '';
      } else {
        argAtual += ch;
      }
      pos++;
    }
    args.push(argAtual);
    while (args.length < 3) args.push('');
    if (pos >= texto.length && texto[pos] !== ')') {
      resultado += texto.slice(inicio, pos + 1);
      i = pos + 1;
      continue;
    }
    var condicao = args[0].trim();
    var textoVerdadeiro = _resolveCondicionais(args[1], avaliarCondicao);
    var textoFalso = _resolveCondicionais(args[2], avaliarCondicao);
    resultado += avaliarCondicao(condicao) ? textoVerdadeiro : textoFalso;
    i = pos + 1;
  }
  return resultado;
}

// Aplica ¨SE(...) e, no resultado, as máscaras ¨chave simples - usada só em
// /enviarEmailPremiados, onde essas condições fazem sentido (ver mascarasDisponiveis em
// enviarEmailPremiadosCtrl.js).
function _aplicaMascarasComCondicao(texto, dados) {
  var avaliarCondicao = function(condicao) {
    var chave = condicao.replace(/^¨/, '').toUpperCase();
    if (chave === 'CLASSIFICADO') return !!dados.classificado;
    if (chave === 'PREMIADO') return !!dados.premiado;
    if (chave === 'MENCAO_HONROSA') return !!dados.mencaoHonrosa;
    return false;
  };
  return _aplicaMascaras(_resolveCondicionais(texto, avaliarCondicao), dados);
}

// Grava um registro de histórico por envio em massa (não por destinatário - inflaria demais),
// nas 4 telas de e-mail (Projetos/Avaliadores/Premiados/Participantes). Fire-and-forget: o
// e-mail já foi confirmado no cliente (res.send({total}) já rodou antes de chamar isso), então
// uma falha aqui só vira log, nunca deve derrubar o envio de verdade.
function _registrarHistoricoEmail(dados) {
  emailHistoricoSchema.create(dados).catch((err) => console.error('Erro ao gravar histórico de e-mail', err));
}

router.post('/enviarEmailProjetos', miPermiso("3"), async (req, res) => {
  try {
    var ids = req.body.idsProjetos;
    var destinatario = req.body.destinatario;
    var assunto = req.body.assunto;
    var corpo = req.body.corpo;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).send('Selecione ao menos um projeto.');
    if (!assunto || !corpo) return res.status(400).send('Preencha assunto e corpo do e-mail.');
    if (!ids.every(idValido)) return res.status(400).send('ID inválido.');

    let projetos = await projetoSchema.find({ _id: { $in: ids } }, '-password');

    var vistos = {};
    var destinatarios = [];
    projetos.forEach(function(projeto) {
      _resolveDestinatarios(projeto, destinatario).forEach(function(d) {
        var chave = d.email.toLowerCase();
        if (!vistos[chave]) { vistos[chave] = true; destinatarios.push(d); }
      });
    });

    // A partir daqui é fire-and-forget de propósito: a resposta já confirma quantos
    // destinatários serão notificados, e o envio de verdade (lento, um SMTP por vez pra
    // não estourar o limite do Gmail) continua em segundo plano - erro de e-mail
    // individual ou de histórico só vira log, não derruba a resposta já dada.
    res.send({ total: destinatarios.length });
    _registrarHistoricoEmail({
      ano: req.body.ano, origem: 'projetos', destinatarioTipo: destinatario, assunto: assunto, corpo: corpo,
      usuario: req.user.username, destinatarios: destinatarios.map(function(d) { return d.email; }), quantidade: destinatarios.length
    });

    var transport = nodemailer.createTransport({
      host: 'smtp.gmail.com', port: 587,
      auth: { user: process.env.SMTP_GMAIL_USER, pass: process.env.SMTP_GMAIL_PASS }
    });
    async.eachSeries(destinatarios, function(d, next) {
      transport.sendMail({
        from: 'MOVACI <va-movaci@ifsul.edu.br>',
        to: d.email,
        subject: _aplicaMascaras(assunto, d),
        html: _aplicaMascaras(corpo, d)
      }, function(err) {
        if (err) { console.error('Erro ao enviar email em massa para ' + d.email, err); }
        setTimeout(next, 300); // evita estourar limite de envio do Gmail SMTP
      });
    });
  } catch (error) {
    console.error('Erro ao buscar projetos para email em massa', error);
    if (!res.headersSent) res.status(500).send('Erro ao enviar e-mail em massa.');
  }
});

// Mesmo espírito de /enviarEmailProjetos, mas só pros projetos em destaque: Premiado, Menção
// honrosa ou classificado pra alguma feira externa (ver Projetos > Premiação) - reaproveita
// _resolveDestinatarios (aluno/orientador/etc), que já inclui colocacao/premiado/mencaoHonrosa/
// classificado/feiraNome em camposProjeto. populate('feirasClassificadas') é o que permite
// ¨feiraNome resolver o nome de verdade (sem isso seria só o ObjectId).
router.post('/enviarEmailPremiados', miPermiso("3"), async (req, res) => {
  try {
    var ids = req.body.idsProjetos;
    var destinatario = req.body.destinatario;
    var assunto = req.body.assunto;
    var corpo = req.body.corpo;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).send('Selecione ao menos um projeto.');
    if (!assunto || !corpo) return res.status(400).send('Preencha assunto e corpo do e-mail.');
    if (!ids.every(idValido)) return res.status(400).send('ID inválido.');

    let projetos = await projetoSchema.find({
      _id: { $in: ids },
      $or: [{ premiacao: { $in: ['Premiado', 'Mencao_honrosa'] } }, { 'feirasClassificadas.0': { $exists: true } }]
    }, '-password').populate('feirasClassificadas');

    var vistos = {};
    var destinatarios = [];
    projetos.forEach(function(projeto) {
      _resolveDestinatarios(projeto, destinatario).forEach(function(d) {
        var chave = d.email.toLowerCase();
        if (!vistos[chave]) { vistos[chave] = true; destinatarios.push(d); }
      });
    });

    // Fire-and-forget de propósito daqui em diante - ver comentário em /enviarEmailProjetos.
    res.send({ total: destinatarios.length });
    _registrarHistoricoEmail({
      ano: req.body.ano, origem: 'premiados', destinatarioTipo: destinatario, assunto: assunto, corpo: corpo,
      usuario: req.user.username, destinatarios: destinatarios.map(function(d) { return d.email; }), quantidade: destinatarios.length
    });

    var transport = nodemailer.createTransport({
      host: 'smtp.gmail.com', port: 587,
      auth: { user: process.env.SMTP_GMAIL_USER, pass: process.env.SMTP_GMAIL_PASS }
    });
    async.eachSeries(destinatarios, function(d, next) {
      transport.sendMail({
        from: 'MOVACI <va-movaci@ifsul.edu.br>',
        to: d.email,
        subject: _aplicaMascarasComCondicao(assunto, d),
        html: _aplicaMascarasComCondicao(corpo, d)
      }, function(err) {
        if (err) { console.error('Erro ao enviar email em massa para ' + d.email, err); }
        setTimeout(next, 300); // evita estourar limite de envio do Gmail SMTP
      });
    });
  } catch (error) {
    console.error('Erro ao buscar projetos premiados para email em massa', error);
    if (!res.headersSent) res.status(500).send('Erro ao enviar e-mail em massa.');
  }
});

// Quantos projetos por eixo contam como "Premiado" ao confirmar (Ranking > Confirmar
// premiados) - lido/gravado por ano no mesmo documento tipo:'edicao' que já guarda
// categoriasEixos/diasAvaliacao (ver models/feira-schema.js). Sem registro pro ano
// (edições antigas, ou a edição ainda nem foi criada em Mostra), assume 3.
router.get('/configPremiacao', miPermiso("3","2"), async (req, res) => {
  var ano = parseInt(req.query.ano, 10);
  if (!ano) return res.status(400).send('Ano inválido.');
  try {
    let doc = await feiraSchema.findOne({ tipo: 'edicao', ano: ano });
    res.send({ numPremiadosPorEixo: (doc && doc.numPremiadosPorEixo) || 3 });
  } catch (error) {
    console.error('Erro ao buscar configuração de premiação', error);
    res.status(500).send('Erro ao buscar configuração.');
  }
});

// Marca premiacao:'Premiado' + colocacao nos projetos informados (o "destaque" de cada
// eixo, já calculado no cliente - ver rankingCtrl.js#confirmarPremiados) e desmarca quem
// tinha sido premiado antes nesse mesmo ano mas não está mais na lista nova (evita deixar
// premiado "fantasma" de uma rodada anterior de confirmação). Grava numPremiadosPorEixo
// pro ano, pra próxima vez que a tela de Ranking carregar já vir com esse valor.
router.post('/confirmarPremiados', miPermiso("3"), async (req, res) => {
  try {
    var ano = parseInt(req.body.ano, 10);
    var numPremiadosPorEixo = parseInt(req.body.numPremiadosPorEixo, 10);
    var premiados = req.body.premiados;
    if (!ano) return res.status(400).send('Ano inválido.');
    if (!numPremiadosPorEixo || numPremiadosPorEixo < 1) return res.status(400).send('Quantidade de premiados por eixo inválida.');
    if (!Array.isArray(premiados) || premiados.length === 0) return res.status(400).send('Nenhum projeto pra confirmar.');
    if (!premiados.every(function(p) { return idValido(p.id) && Number.isInteger(p.colocacao) && p.colocacao > 0; })) {
      return res.status(400).send('Lista de premiados inválida.');
    }

    var idsNovos = premiados.map(function(p) { return p.id; });
    var filtroAno = { createdAt: { $gte: new Date(ano, 0, 1), $lt: new Date(ano + 1, 0, 1) } };

    await projetoSchema.updateMany(
      Object.assign({ premiacao: 'Premiado', _id: { $nin: idsNovos } }, filtroAno),
      { $unset: { premiacao: '', colocacao: '' } }
    );

    for (let p of premiados) {
      await projetoSchema.findByIdAndUpdate(p.id, { premiacao: 'Premiado', colocacao: p.colocacao });
    }

    await feiraSchema.findOneAndUpdate(
      { tipo: 'edicao', ano: ano },
      { $set: { numPremiadosPorEixo: numPremiadosPorEixo }, $setOnInsert: { tipo: 'edicao', ano: ano, createdAt: new Date() } },
      { upsert: true }
    );
    res.send({ marcados: premiados.length });
  } catch (error) {
    console.error('Erro ao confirmar premiados', error);
    res.status(500).send('Erro ao confirmar premiados.');
  }
});

// Mesmo espírito de /enviarEmailProjetos, mas pra avaliadores - schema mais simples (um
// e-mail por avaliador, sem integrantes aninhados), então não precisa de destinatário/tipo.
router.post('/enviarEmailAvaliadores', miPermiso("3"), async (req, res) => {
  try {
    var ids = req.body.idsAvaliadores;
    var assunto = req.body.assunto;
    var corpo = req.body.corpo;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).send('Selecione ao menos um avaliador.');
    if (!assunto || !corpo) return res.status(400).send('Preencha assunto e corpo do e-mail.');
    if (!ids.every(idValido)) return res.status(400).send('ID inválido.');

    let avaliadores = await avaliadorSchema.find({ _id: { $in: ids } });

    var vistos = {};
    var destinatarios = [];
    avaliadores.forEach(function(avaliador) {
      if (!avaliador.email) return;
      var chave = avaliador.email.toLowerCase();
      if (vistos[chave]) return;
      vistos[chave] = true;
      destinatarios.push({
        nome: avaliador.nome, email: avaliador.email, categoria: avaliador.categoria,
        eixo: avaliador.eixo, nivelAcademico: avaliador.nivelAcademico
      });
    });

    // Fire-and-forget de propósito daqui em diante - ver comentário em /enviarEmailProjetos.
    res.send({ total: destinatarios.length });
    _registrarHistoricoEmail({
      ano: req.body.ano, origem: 'avaliadores', assunto: assunto, corpo: corpo,
      usuario: req.user.username, destinatarios: destinatarios.map(function(d) { return d.email; }), quantidade: destinatarios.length
    });

    var transport = nodemailer.createTransport({
      host: 'smtp.gmail.com', port: 587,
      auth: { user: process.env.SMTP_GMAIL_USER, pass: process.env.SMTP_GMAIL_PASS }
    });
    async.eachSeries(destinatarios, function(d, next) {
      transport.sendMail({
        from: 'MOVACI <va-movaci@ifsul.edu.br>',
        to: d.email,
        subject: _aplicaMascaras(assunto, d),
        html: _aplicaMascaras(corpo, d)
      }, function(err) {
        if (err) { console.error('Erro ao enviar email em massa para ' + d.email, err); }
        setTimeout(next, 300); // evita estourar limite de envio do Gmail SMTP
      });
    });
  } catch (error) {
    console.error('Erro ao buscar avaliadores para email em massa', error);
    if (!res.headersSent) res.status(500).send('Erro ao enviar e-mail em massa.');
  }
});

// Mesmo espírito de /enviarEmailAvaliadores - participante só entra na lista de destinatários
// se tiver e-mail cadastrado (campo novo, opcional, muitos registros antigos não têm).
router.post('/enviarEmailParticipantes', miPermiso("3"), async (req, res) => {
  try {
    var ids = req.body.idsParticipantes;
    var assunto = req.body.assunto;
    var corpo = req.body.corpo;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).send('Selecione ao menos um participante.');
    if (!assunto || !corpo) return res.status(400).send('Preencha assunto e corpo do e-mail.');
    if (!ids.every(idValido)) return res.status(400).send('ID inválido.');

    let participantes = await participanteSchema.find({ _id: { $in: ids } });

    var vistos = {};
    var destinatarios = [];
    participantes.forEach(function(participante) {
      if (!participante.email) return;
      var chave = participante.email.toLowerCase();
      if (vistos[chave]) return;
      vistos[chave] = true;
      destinatarios.push({ nome: participante.nome, email: participante.email });
    });

    // Fire-and-forget de propósito daqui em diante - ver comentário em /enviarEmailProjetos.
    res.send({ total: destinatarios.length });
    _registrarHistoricoEmail({
      ano: req.body.ano, origem: 'participantes', assunto: assunto, corpo: corpo,
      usuario: req.user.username, destinatarios: destinatarios.map(function(d) { return d.email; }), quantidade: destinatarios.length
    });

    var transport = nodemailer.createTransport({
      host: 'smtp.gmail.com', port: 587,
      auth: { user: process.env.SMTP_GMAIL_USER, pass: process.env.SMTP_GMAIL_PASS }
    });
    async.eachSeries(destinatarios, function(d, next) {
      transport.sendMail({
        from: 'MOVACI <va-movaci@ifsul.edu.br>',
        to: d.email,
        subject: _aplicaMascaras(assunto, d),
        html: _aplicaMascaras(corpo, d)
      }, function(err) {
        if (err) { console.error('Erro ao enviar email em massa para ' + d.email, err); }
        setTimeout(next, 300); // evita estourar limite de envio do Gmail SMTP
      });
    });
  } catch (error) {
    console.error('Erro ao buscar participantes para email em massa', error);
    if (!res.headersSent) res.status(500).send('Erro ao enviar e-mail em massa.');
  }
});

// Histórico de e-mails em massa (Projetos/Avaliadores/Premiados/Participantes), por ano - ver
// menu "Histórico de E-mails" e _registrarHistoricoEmail acima, chamado nas 4 rotas de envio.
router.get('/historicoEmails', miPermiso("3"), async (req, res) => {
  var ano = parseInt(req.query.ano, 10);
  if (!ano) return res.status(400).send('Ano inválido.');
  try {
    let historico = await emailHistoricoSchema.find({ ano: ano }).sort({ data: -1 });
    res.send(historico);
  } catch (error) {
    console.error('Erro ao buscar histórico de e-mails', error);
    res.status(500).send('Erro ao buscar histórico.');
  }
});

router.post('/avaliador', miPermiso("2","3"), async (req, res) => {
  try {
    let usr = await avaliadorSchema.find();
    res.send(usr);
  } catch (error) {
    console.error('Erro em avaliador', error);
  }
});

router.post('/saberes', miPermiso("2","3"), async (req, res) => {
  try {
    let usr = await saberesSchema.find();
    res.send(usr);
  } catch (error) {
    console.error('Erro em saberes docentes', error);
  }
});

// Três situações possíveis: aprovado pros anais, aprovado só pra apresentação, ou não
// aprovado. "aprovado" continua booleano (true pros dois tipos de aprovação) e
// "tipoAprovacao" diz qual dos dois - ver models/projeto-schema.js.
// projetosAprovados (lista antiga, sem tipo) ainda é aceita por compatibilidade.
router.put('/upgreice', ensureAuthenticated, miPermiso("3"), async (req, res) => {
  try {
    let aprovadosSemTipo = req.body.projetosAprovados || [];
    let anais = req.body.projetosAnais || [];
    let apresentacao = req.body.projetosApresentacao || [];
    let reprovados = req.body.projetosReprovados || [];

    let marcar = async (ids, update) => {
      for (let id of ids) {
        await projetoSchema.findOneAndUpdate({"_id": id}, update, {returnDocument: 'after'});
      }
    };

    await marcar(aprovadosSemTipo, {"$set": {"aprovado": true}});
    await marcar(anais, {"$set": {"aprovado": true, "tipoAprovacao": "anais"}});
    await marcar(apresentacao, {"$set": {"aprovado": true, "tipoAprovacao": "apresentacao"}});
    // "$set: aprovado:false" (não "$unset") - com unset, reprovado ficava
    // indistinguível de "ainda não avaliado" (ambos undefined): o aviso de reprovação
    // pro participante (adminCtrl.js, projeto.aprovado === false) nunca disparava, e
    // não tinha como filtrar reprovados nos relatórios. tipoAprovacao sai junto, senão
    // sobraria um tipo de aprovação num projeto não aprovado.
    await marcar(reprovados, {"$set": {"aprovado": false}, "$unset": {"tipoAprovacao": true}});

    res.send('success');
  } catch (error) {
    console.error('Erro ao aprovar/reprovar projetos', error);
    res.status(500).send('Erro ao aprovar/reprovar projetos');
  }
});

router.put('/upgreiceAvaliadores', ensureAuthenticated, miPermiso("3"), async (req, res) => {
  try {
    let myArray0 = req.body.avaliadoresMarcados;
    let myArray1 = req.body.avaliadoresNMarcados;

    for (let id_doc of myArray0) {
      await avaliadorSchema.findOneAndUpdate({"_id": id_doc}, {"$set": {"avaliacao": true}}, {returnDocument: 'after'});
    }

    for (let id_doc of myArray1) {
      await avaliadorSchema.findOneAndUpdate({"_id": id_doc}, {"$unset": {"avaliacao": true}}, {returnDocument: 'after'});
    }
    res.send('success');
  } catch (error) {
    console.error('Erro na avaliação', error);
    res.status(500).send('Erro na avaliação');
  }
});


router.put('/update', ensureAuthenticated, miPermiso("3"), async (req, res) => {
  try {
    if (req.body.cep !== undefined){
      req.body.cep = splita(req.body.cep);
    }
    let id = req.body._id;
    if (!idValido(id)) return res.status(400).send('ID inválido');
    let newProject = filtrarCamposEditaveis(req.body);

    console.log(newProject);

    // Mesmo bug/fix já corrigido no grupo 4 (routes/projetos.js): .update() nunca devolve
    // o documento, mesmo com {new:true} - vira findOneAndUpdate(), que de fato devolve.
    let docs = await projetoSchema.findOneAndUpdate({'_id':id}, {$set:newProject, updatedAt: Date.now()}, {upsert:true, returnDocument: 'after'});
    res.status(200).json(docs);
  } catch (error) {
    console.error('Erro ao editar', error);
    res.status(500).send('Erro ao editar');
  }
});

router.put('/upgreiceEditProjeto', ensureAuthenticated, miPermiso("3"), async (req, res) => {
  try {
    let myArray = req.body;
    if (!myArray.length) return res.status(400).send('Nenhum integrante enviado');
    let id = myArray[0].ID;
    if (!idValido(id)) return res.status(400).send('ID inválido');
    if (!(await projetoSchema.findById(id, '_id'))) return res.status(404).send('Projeto não encontrado');

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

    // Antes a resposta de sucesso saía na hora, sem esperar essas gravações
    // terminarem (nem checar se deram erro) - então um orientador novo podia
    // falhar em silêncio no banco (ex: erro do Mongo) enquanto o admin via
    // "Alteração realizada com sucesso!" na tela. Agora espera todas terminarem de
    // verdade antes de responder.
    let promessas = myArray.map(function (value) {
      if (value._id !== undefined) {
        if (!idValido(value._id)) return Promise.resolve();
        let newIntegrante = ({
          _id: value._id,
          tipo: value.tipo,
          nome: value.nome,
          email: value.email,
          nacionalidade: value.nacionalidade,
          cpf: splita(value.cpf),
          telefone: splita(value.telefone),
          tamCamiseta: value.tamCamiseta
        });
        return projetoSchema.findOneAndUpdate({"_id": id, "integrantes._id": value._id},
          {"$set": {"integrantes.$": newIntegrante, updatedAt: Date.now()}}, {returnDocument: 'after'});
      }

      let newIntegrante = ({
        tipo: value.tipo,
        nome: value.nome,
        email: value.email,
        nacionalidade: value.nacionalidade,
        cpf: splita(value.cpf),
        telefone: splita(value.telefone),
        tamCamiseta: value.tamCamiseta
      });
      // Bug real encontrado e corrigido ao testar o grupo 4 (routes/projetos.js), mesmo
      // padrão aqui: usr.integrantes.push(...) + usr.save() gera um modificador $pushAll,
      // removido pelo MongoDB desde a 3.6 - falhava sempre, silenciosamente. $push
      // atômico via findOneAndUpdate resolve.
      return projetoSchema.findOneAndUpdate({"_id": id},
        {"$push": {"integrantes": newIntegrante}, "$set": {updatedAt: Date.now()}}, {returnDocument: 'after'});
    });

    await Promise.all(promessas);
    res.status(200).json(myArray);
  } catch (error) {
    console.error('Erro ao editar integrantes', error);
    res.status(500).send('Falha ao salvar integrantes');
  }
});

router.put('/removerIntegrante', ensureAuthenticated, miPermiso("3"), async (req, res) => {
  try {
    let id = req.body.integrantes_id;
    let ID = req.body.ID;
    if (!idValido(id) || !idValido(ID)) return res.status(400).send('ID inválido');

    // Duas chamadas viraram uma só, atômica: a antiga usava usr.integrantes.id(id).remove()
    // + usr.save() (API de subdocumento removida nas versões novas do Mongoose) e, em
    // paralelo, um .update() separado só pra updatedAt que nunca devolvia o documento de
    // verdade (mesmo bug já corrigido no grupo 4) - res.json(docs) sempre mandava
    // {n,nModified,ok}, nunca o projeto. $pull via findOneAndUpdate resolve os dois de vez.
    let docs = await projetoSchema.findOneAndUpdate(
      { _id: ID },
      { $pull: { integrantes: { _id: id } }, $set: { updatedAt: Date.now() } },
      { returnDocument: 'after' }
    );
    res.status(200).json(docs);
  } catch (error) {
    console.error('Erro ao remover integrante', error);
    res.status(500).send('Erro ao remover integrante');
  }
});

router.put('/removeProjeto', miPermiso("3"), async (req, res) => {
  try {
    let id = req.body.id;
    if (!idValido(id)) return res.status(400).send('ID inválido');
    await projetoSchema.deleteOne({"_id": id});
    res.send('success');
  } catch (error) {
    console.error('Erro ao remover projeto', error);
    res.status(500).send('Erro ao remover projeto');
  }
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
  projetoSchema.find({"participa":true,"categoria":"Ensino Médio, Técnico e Superior"}).sort({"eixo":1, "nomeProjeto":1}).then((usr) => {
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
  }).catch((err) => console.error(err));
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

  projetoSchema.find({"aprovado":true,"categoria":"Fundamental I (1º ao 5º anos)"}).sort({"eixo":1, "nomeProjeto":1}).then((user) => {
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
  }).catch((err) => console.error(err));

  res.sendStatus(200);
});

module.exports = router;
