'use strict';

const express = require('express')
, nodemailer = require('nodemailer')
, EmailTemplate = require('../utils/emailTemplate').EmailTemplate
, path = require('path')
, router = express.Router()
, passport = require('passport')
, LocalStrategy = require('passport-local').Strategy
, Avaliador = require('../controllers/avaliador-controller')
, loginBootstrap = require('../utils/loginBootstrap')
, pessoaController = require('../controllers/pessoa-controller')
, session = require('express-session')
, crypto = require('crypto')
, bcrypt = require('bcryptjs')
, ProjetoSchema = require('../models/projeto-schema')
, AvaliadorSchema = require('../models/avaliador-schema')
, ParticipanteSchema = require('../models/participante-schema')
, feiraSchema = require('../models/feira-schema')
, sessao = require('../utils/sessao')
, perfil = require('../utils/perfil')
, pendencias = require('../utils/pendencias');

function splita(arg){
  if (arg !== undefined) {
    let data = arg.replace(/([-.() ])/g,'');
    return data;
  }
}

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated())
  return next();
  else{
    res.send('0');
  }
}

function idValido(id) {
  return typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
}

// Pessoa logada que é avaliador(a): põe em req.avaliador o registro de Avaliador mais recente
// dela (ver utils/sessao.js). Conta legada sem Pessoa loga como o próprio Avaliador.
async function ensureAvaliador(req, res, next) {
  if (!req.isAuthenticated()) return res.sendStatus(403);
  try {
    req.avaliador = await sessao.avaliadorDaSessao(req);
  } catch (err) {
    console.error('Erro ao resolver avaliador(a) da sessão', err);
    return res.sendStatus(500);
  }
  if (!req.avaliador) return res.sendStatus(403);
  next();
}

router.get('/', function(req, res, next) {
  res.send('Avaliadores mt loucos nóis');
});

router.post('/registro', async (req, res) => {
	let checagem = Avaliador.validarDocumento(req.body.cpf);
	if (!checagem.valido) return res.status(400).send(checagem.mensagem);

	let checagemTelefone = Avaliador.validarTelefone(req.body.telefone);
	if (!checagemTelefone.valido) return res.status(400).send(checagemTelefone.mensagem);

	// Precisa se inscrever pra avaliar pelo menos uma combinação categoria+eixo, e cada uma
	// precisa ter os dois campos preenchidos (evita registro incompleto vindo de fora do form).
	let categoriasEixos = Array.isArray(req.body.categoriasEixos) ? req.body.categoriasEixos : [];
	let categoriasEixosValidas = categoriasEixos.length > 0 && categoriasEixos.every((ce) => ce && ce.categoria && ce.eixo);
	if (!categoriasEixosValidas) return res.status(400).send('Selecione ao menos uma categoria e eixo temático.');

	// A tela de inscrição de avaliadores do master (public/admin/views/avaliadores.html) reusa
	// esta mesma rota e já tem um filtro de ano no cabeçalho; permite que esse ano seja usado
	// para cadastrar avaliadores em anos anteriores, em vez de sempre cair no ano atual.
	// Na inscrição pública normal (site), "ano" nunca é enviado e o comportamento não muda.
	let anoInformado = parseInt(req.body.ano, 10);
	let anoValido = !isNaN(anoInformado) && anoInformado >= 2016 && anoInformado <= new Date().getFullYear();
	let createdAt = anoValido ? new Date(new Date().setFullYear(anoInformado)) : Date.now();

	// A qual Mostra este avaliador pertence (Fase 2, ver memória project-mostra-ano-nao-unico):
	// vem do slug do link de inscrição usado (/avaliadores/inscricao/:slug), resolvido pro _id
	// da Feira correspondente. Sem slug (link antigo, tela do admin, ou nenhuma edição com
	// slug ainda), feiraId fica undefined - mesmo comportamento de antes da Fase 2.
	// Cadastro pela tela do admin manda a Mostra selecionada no filtro (feiraId) - só vale pra
	// admin dessa Mostra (utils/perfil.js), senão qualquer um poderia anexar um cadastro a uma
	// Mostra qualquer. Mostra inválida => 400; Mostra de outro(a) admin => 403.
	let feiraId;
	if (req.body.feiraId && (await perfil.carregar(req)).ehAdmin) {
		try {
			let feira = idValido(req.body.feiraId) ? await feiraSchema.findOne({ _id: req.body.feiraId, tipo: 'edicao' }, '_id') : null;
			if (!feira) return res.status(400).send('Mostra inválida');
			if (!(await perfil.podeMostra(req, req.body.feiraId))) return res.status(403).send('Escolha uma das Mostras que você administra.');
			feiraId = feira._id;
		} catch (err) {
			console.error('Erro ao resolver a Mostra do cadastro', err);
			return res.status(500).send('error');
		}
	} else if (req.body.slug) {
		try {
			let feira = await feiraSchema.findOne({ tipo: 'edicao', slug: req.body.slug });
			feiraId = feira ? feira._id : undefined;
		} catch (err) {
			console.error('Erro ao resolver edição do slug', err);
			return res.status(500).send('error');
		}
	}

	let newAvaliador = AvaliadorSchema({
		nome: req.body.nome,
		email: req.body.email,
		nacionalidade: req.body.nacionalidade,
		cpf: checagem.normalizado,
		rg: splita(req.body.rg),
		dtNascimento: req.body.dtNascimento,
		nivelAcademico: req.body.nivelAcademico,
		categoriasEixos: categoriasEixos,
		atuacaoProfissional: req.body.atuacaoProfissional,
		tempoAtuacao: req.body.tempoAtuacao,
		telefone: splita(req.body.telefone),
		curriculo: req.body.curriculo,
		turnos: req.body.turnos,
		disponibilidade: Array.isArray(req.body.disponibilidade) ? req.body.disponibilidade : [],
		// Se oferece pra avaliação PRÉVIA dos trabalhos (a organização aprova depois).
		aceitaAvaliacaoPrevia: req.body.aceitaAvaliacaoPrevia === true,
		avaliacao: req.body.avaliacao,
		createdAt: createdAt,
		feiraId: feiraId
	});

	// Login único: vincula à Pessoa do mesmo documento (ver controllers/pessoa-controller.js#vincularPessoa)
	newAvaliador.pessoa = await pessoaController.vincularPessoa({
		cpf: newAvaliador.cpf,
		nome: newAvaliador.nome,
		email: newAvaliador.email,
		telefone: newAvaliador.telefone,
		nacionalidade: newAvaliador.nacionalidade
	});

	Avaliador.createAvaliador(newAvaliador);

	// E-mail de confirmação de inscrição, no mesmo padrão usado pra projetos (routes/index.js).
	// O template já existia (templates/inscricaoavaliador) mas nunca tinha sido escrito nem
	// conectado a esta rota — o e-mail nunca era enviado de fato.
	var templatesDir = path.resolve(__dirname, '..', 'templates');
	var template = new EmailTemplate(path.join(templatesDir, 'inscricaoavaliador'));
	const transport = nodemailer.createTransport({
		host: 'smtp.gmail.com',
		port: 587,
		auth: {
			user: process.env.SMTP_GMAIL_USER,
			pass: process.env.SMTP_GMAIL_PASS
		}
	});
	var locals = {
		nome: req.body.nome,
		email: req.body.email
	};
	template.render(locals, function (err, results) {
		if (err) { console.error(err); return; }
		transport.sendMail({
			from: 'MOVACI <va-movaci@ifsul.edu.br>',
			to: locals.email,
			subject: 'MOVACI - Confirmação de inscrição de avaliador',
			html: results.html,
			text: results.text
		}, function (err) {
			if (err) { console.error(err); return; }
		});
	});

	res.send('success');
});

router.get('/loggedin', ensureAuthenticated, (req, res) => {
  res.send('success');
});

// DASHBOARD DO AVALIADOR (login próprio) ===================================

// Quem está logado, senha e recuperação de senha agora são da conta (routes/index.js
// /conta/loggedin, /conta/trocar-senha, /conta/esqueci-senha e /conta/nova-senha/:token - esta
// última também aceita tokens antigos gravados no Avaliador).

// Dados pessoais - GET pra carregar a tela, PUT pra editar (campos de identidade como
// cpf/email/nome ficam de fora, só o admin altera esses hoje).
router.get('/dashboard/meus-dados', ensureAvaliador, async (req, res) => {
  try {
    let avaliador = await AvaliadorSchema.findById(req.avaliador._id, '-password -resetPasswordToken -resetPasswordCreatedDate');
    res.send(avaliador);
  } catch (err) {
    console.error('Erro ao buscar dados do avaliador', err);
  }
});

router.put('/dashboard/meus-dados', ensureAvaliador, pendencias.exigeSemPendencias, async (req, res) => {
  let campos = {
    telefone: splita(req.body.telefone),
    nivelAcademico: req.body.nivelAcademico,
    atuacaoProfissional: req.body.atuacaoProfissional,
    tempoAtuacao: req.body.tempoAtuacao,
    curriculo: req.body.curriculo
  };
  // Pode deixar de se oferecer pra avaliação prévia (ou passar a se oferecer); a aprovação
  // (aptoAvaliacaoPrevia) continua com a organização. Só mexe se a tela mandou o campo.
  if (typeof req.body.aceitaAvaliacaoPrevia === 'boolean') campos.aceitaAvaliacaoPrevia = req.body.aceitaAvaliacaoPrevia;
  try {
    await AvaliadorSchema.findByIdAndUpdate(req.avaliador._id, { $set: campos }, { returnDocument: 'after' });
    res.send('success');
  } catch (err) {
    console.error('Erro ao atualizar dados do avaliador', err);
    return res.status(500).send('Erro ao salvar.');
  }
});

// Lançar nota é coisa do admin (Avaliação > Inserir, Inconsistências, app de Avaliação/Ranking)
// - antes bastava estar logado, então qualquer avaliador(a)/participante podia mudar a nota de
// qualquer projeto. Agora: admin, e só em projeto das Mostras dele(a).
router.put('/addNota', ensureAuthenticated, perfil.exigeAdmin, async (req, res) => {
	try {
	let id = req.body.id
	,	arrayNota = req.body.adrovan;
	if (!idValido(id)) return res.status(400).send('ID inválido');
	// Só projeto de uma das Mostras do(a) admin (utils/perfil.js).
	if (await perfil.foraDoEscopo(req, ProjetoSchema, { _id: id })) return res.status(403).send('Fora das Mostras que você administra.');

	(async () => {
		try {
			let usr = await ProjetoSchema.findOne({_id: id});
			usr.avaliacao = arrayNota;
			// Lançar nota é sinal de que o(a) pesquisador(a) esteve presente pra apresentar o
			// projeto - confirma participação automaticamente (ver Projetos > Presença), pra
			// equipe de credenciamento não precisar marcar de novo manualmente o que a nota já
			// atesta. Só marca ao lançar nota de verdade (arrayNota não vazio); apagar a
			// avaliação não desfaz uma presença já confirmada.
			if (Array.isArray(arrayNota) && arrayNota.length > 0) {
				usr.participa = true;
			}
			await usr.save();
		} catch (err) {
			console.error('Erro', err);
		}
	})();
	res.send(200);
	console.log("Feito adrovão");

	} catch (error) {
		console.error("Erro em addNota", error);
	}
});

module.exports = router;
