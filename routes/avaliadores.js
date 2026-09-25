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
, feiraSchema = require('../models/feira-schema');

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

// Garante que quem está autenticado é mesmo um Avaliador (não Projeto/Admin) - login
// único acontece em routes/index.js (strategy 'unico'), aqui só protege as rotas do
// dashboard próprio do avaliador.
function ensureAvaliador(req, res, next) {
  if (req.isAuthenticated() && req.user.constructor.modelName === 'Avaliador') {
    return next();
  }
  res.sendStatus(403);
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
	let feiraId;
	if (req.body.slug) {
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
		cpf: splita(req.body.cpf),
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

router.get('/dashboard/loggedin', ensureAvaliador, async (req, res) => {
  try {
    let credencial = await loginBootstrap.carregarCredencial(req.user);
    res.send({
      nome: req.user.nome,
      email: req.user.email,
      senhaDefinida: !!credencial.senhaDefinida,
      avaliacao: !!req.user.avaliacao
    });
  } catch (err) {
    console.error('Erro ao carregar dados do avaliador logado', err);
    res.status(500).send('error');
  }
});

// Troca de senha - funciona tanto pro primeiro acesso (senhaDefinida false, não exige
// senhaAtual - a "senha" usada pra logar nesse caso foi o documento) quanto pra troca
// voluntária estando logado (senhaDefinida true, exige senhaAtual correta).
router.post('/dashboard/trocar-senha', ensureAvaliador, async (req, res) => {
  let novaSenha = req.body.novaSenha;
  if (!Avaliador.senhaForte(novaSenha)) {
    return res.status(400).send('A senha precisa ter de 8 a 12 caracteres, com maiúscula, minúscula, número e símbolo.');
  }

  try {
    let avaliador = await AvaliadorSchema.findById(req.user._id);
    if (!avaliador) return res.status(404).send('Avaliador não encontrado.');

    // Senha mora na Pessoa vinculada (compartilhada entre papéis) ou, sem vínculo, no
    // próprio avaliador - ver utils/loginBootstrap.js#carregarCredencial.
    let credencial = await loginBootstrap.carregarCredencial(avaliador);
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
    console.error('Erro ao trocar senha de avaliador', err);
    return res.status(500).send('Erro ao trocar senha.');
  }
});

// Recuperação de senha (esqueci a senha) - mesmo padrão de routes/index.js pro Projeto:
// token aleatório com expiração de 1h, enviado por e-mail.
router.post('/dashboard/redefinir-senha', async (req, res) => {
  let email = req.body.email;
  let avaliador;
  let token = crypto.randomBytes(20).toString('hex');
  try {
    avaliador = await AvaliadorSchema.findOne({ email: email });
    if (!avaliador) return res.status(404).send('E-mail não encontrado.');

    // Token vai pra Pessoa vinculada (o link redefine a senha única dela) ou, sem vínculo,
    // pro próprio avaliador.
    let credencial = await loginBootstrap.carregarCredencial(avaliador);
    await credencial.constructor.updateOne(
      { _id: credencial._id },
      { $set: { resetPasswordToken: token, resetPasswordCreatedDate: Date.now() + 3600000 } }
    );
  } catch (err) {
    console.error('Erro ao redefinir senha de avaliador', err);
    return res.status(500).send('error');
  }

  res.send(email);

  var templatesDir = path.resolve(__dirname, '..', 'templates');
  var template = new EmailTemplate(path.join(templatesDir, 'redefinicao-avaliador'));
  const transport = nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 587,
    auth: { user: process.env.SMTP_GMAIL_USER, pass: process.env.SMTP_GMAIL_PASS }
  });
  var locals = { email: email, nome: avaliador.nome, url: "http://www.movaci.com.br/avaliadores/dashboard/nova-senha/" + token };
  template.render(locals, function (err, results) {
    if (err) { console.error(err); return; }
    transport.sendMail({
      from: 'MOVACI <va-movaci@ifsul.edu.br>',
      to: email,
      subject: 'MOVACI - Redefinição de senha (avaliador)',
      html: results.html,
      text: results.text
    }, function (err) {
      if (err) { console.error(err); return; }
    });
  });
});

router.post('/dashboard/nova-senha/:token', async (req, res) => {
  try {
    // Token na Pessoa (fluxo novo) ou no avaliador (emitido antes do login único / sem vínculo).
    let dono = await loginBootstrap.encontrarPorTokenReset(AvaliadorSchema, req.params.token);
    if (!dono) return res.send('erro2');
    if (dono.hasExpired()) return res.send('erro3');
    if (!Avaliador.senhaForte(req.body.password)) {
      return res.status(400).send('A senha precisa ter de 8 a 12 caracteres, com maiúscula, minúscula, número e símbolo.');
    }

    // A senha nova vai pra quem guarda a senha (a Pessoa, se o avaliador estiver vinculado -
    // mesmo que o token legado tenha sido gravado no avaliador).
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
    console.error('Erro ao definir nova senha de avaliador', err);
    return res.send('erro');
  }
});

// Dados pessoais - GET pra carregar a tela, PUT pra editar (campos de identidade como
// cpf/email/nome ficam de fora, só o admin altera esses hoje).
router.get('/dashboard/meus-dados', ensureAvaliador, async (req, res) => {
  try {
    let avaliador = await AvaliadorSchema.findById(req.user._id, '-password -resetPasswordToken -resetPasswordCreatedDate');
    res.send(avaliador);
  } catch (err) {
    console.error('Erro ao buscar dados do avaliador', err);
  }
});

router.put('/dashboard/meus-dados', ensureAvaliador, async (req, res) => {
  let campos = {
    telefone: splita(req.body.telefone),
    nivelAcademico: req.body.nivelAcademico,
    atuacaoProfissional: req.body.atuacaoProfissional,
    tempoAtuacao: req.body.tempoAtuacao,
    curriculo: req.body.curriculo
  };
  try {
    await AvaliadorSchema.findByIdAndUpdate(req.user._id, { $set: campos }, { returnDocument: 'after' });
    res.send('success');
  } catch (err) {
    console.error('Erro ao atualizar dados do avaliador', err);
    return res.status(500).send('Erro ao salvar.');
  }
});

// Certificados disponíveis - mesma regra já usada na emissão pública por CPF
// (routes/index.js#pesquisaAvaliador): só quem tem presença confirmada (avaliacao:true)
// tem certificado. O token já existe sempre (gerado automaticamente no pre-save do
// schema), então aqui não precisa gerar nada, só devolver os dados de quem já está logado.
router.get('/dashboard/meus-certificados', ensureAvaliador, (req, res) => {
  if (!req.user.avaliacao) return res.send([]);
  let avaliadas = (req.user.categoriasEixosAvaliados && req.user.categoriasEixosAvaliados.length)
    ? req.user.categoriasEixosAvaliados
    : req.user.categoriasEixos;
  res.send([{
    nome: req.user.nome,
    email: req.user.email,
    token: req.user.token,
    createdAt: req.user.createdAt,
    ano: new Date(req.user.createdAt).getFullYear(),
    categoriasAvaliadas: Avaliador.formatarCategoriasEixos(avaliadas)
  }]);
});

router.put('/addNota', ensureAuthenticated, (req, res) => {
	try {
	let id = req.body.id
	,	arrayNota = req.body.adrovan;
	if (!idValido(id)) return res.status(400).send('ID inválido');

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
