//Mateus Roberto Algayer - 07/09/2022 :: Revisões

'use strict';

require('dotenv').config();

const express = require('express'),
      path = require('path'),
      crypto = require('crypto'),
      favicon = require('serve-favicon'),
      logger = require('morgan'),
      helmet = require('helmet'),
      cookieParser = require('cookie-parser'),
      passport = require('passport'),
      session = require('express-session'),
      { MongoStore } = require('connect-mongo'),
      LocalStrategy = require('passport-local').Strategy,
      expressValidator = require('express-validator'),
      //flash = require('connect-flash'),
      bodyParser = require('body-parser'),
      // db-config precisa ser carregado antes das rotas/models: abre a conexão padrão do
      // Mongoose que os models (incluindo o plugin de auto-incremento em projeto-schema.js)
      // passam a reaproveitar, em vez de cada um abrir sua própria conexão com o banco.
      db = require('./configs/db-config'),
      routes = require('./routes/index'),
      projetos = require('./routes/projetos'),
      avaliadores = require('./routes/avaliadores'),
      participantes = require('./routes/participantes'),
      saberes = require('./routes/saberes-docentes'),
      admin = require('./routes/admin'),
      app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Necessário para o cookie de sessão "secure: auto" reconhecer HTTPS quando o
// app roda atrás do proxy reverso (nginx) do servidor de produção.
app.set('trust proxy', 1);

app.use(logger('dev'));
// CSP desabilitado: o front-end (EJS/Angular legado) depende fortemente de
// estilos/scripts inline e recursos de CDNs externas, que uma CSP padrão bloquearia.
// Mantém os demais cabeçalhos de segurança do helmet (X-Frame-Options, nosniff, HSTS, etc.).
app.use(helmet({ contentSecurityPolicy: false }));
app.use(bodyParser.json({limit : '10mb' }));
app.use(bodyParser.urlencoded({ extended: false, limit : '10mb' }));
app.use(cookieParser());
// Vídeos precisam de um Cache-Control com max-age > 0: o padrão do Express (max-age=0)
// faz o navegador revalidar com If-None-Match a cada requisição de range, e como o
// vídeo não muda, o servidor responde 304 (sem corpo) - o elemento <video> não sabe
// lidar com isso no meio de uma requisição de range e simplesmente para de carregar.
app.use('/assets/videos', express.static(path.join(__dirname, 'public', 'assets', 'videos'), { maxAge: '7d' }));
app.use(express.static(path.join(__dirname, 'public')));

// Proteção CSRF (double-submit cookie). Usa os nomes padrão do AngularJS
// (cookie XSRF-TOKEN / header X-XSRF-TOKEN), que o $http já envia sozinho
// em toda requisição same-origin — nenhuma mudança necessária no front-end.
const METODOS_PROTEGIDOS_CSRF = ['POST', 'PUT', 'DELETE', 'PATCH'];
app.use((req, res, next) => {
  let token = req.cookies['XSRF-TOKEN'];
  if (!token) {
    token = crypto.randomBytes(24).toString('hex');
    res.cookie('XSRF-TOKEN', token, { sameSite: 'lax' });
  }
  if (METODOS_PROTEGIDOS_CSRF.includes(req.method)) {
    const headerToken = req.headers['x-xsrf-token'];
    if (!headerToken || headerToken !== token) {
      return res.status(403).send('Token CSRF ausente ou inválido');
    }
  }
  next();
});

// Express Session
// Antes usava o MemoryStore padrão do express-session, que a própria lib desaconselha pra
// produção: vaza memória, derruba todas as sessões a cada restart do processo (que aqui
// acontece toda hora, já que o nodemon reinicia a cada mudança de arquivo) e não escala.
app.use(session({
    secret: process.env.SESSION_SECRET,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/loginapp',
      collectionName: 'sessions'
    }),
    saveUninitialized: true,
    resave: true,
    cookie: {
      httpOnly: true,
      secure: 'auto',
      sameSite: 'lax'
    }
}));

// Passport init
app.use(passport.initialize());
app.use(passport.session());

// Express Validator
app.use(expressValidator({
  errorFormatter: (param, msg, value) => {
      let namespace = param.split('.')
      , root = namespace.shift()
      , formParam = root;

    while(namespace.length) {
      formParam += '[' + namespace.shift() + ']';
    }
    return {
      param : formParam,
      msg   : msg,
      value : value
    };
  }
}));

// Global Vars
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  next();
});

app.use('/', routes);
app.use('/projetos', projetos);
app.use('/avaliadores', avaliadores);
app.use('/participantes', participantes);
app.use('/admin', admin);
app.use('/saberes-docentes', saberes);

// catch 404
// Antes, tentava redirecionar E chamar next(err) para um error handler que não existe:
// como o redirect já envia a resposta, o next(err) sobrava tentando escrever de novo
// numa resposta já finalizada (gerava erros de "headers already sent" no log).
app.use(function(req, res) {
  res.redirect('/404');
});

// Handler de erro central (precisa ter 4 argumentos para o Express reconhecer como tal).
// Antes não existia nenhum: erros passados via next(err) — ex: JSON malformado no corpo da
// requisição, capturado pelo body-parser — caíam no handler padrão do Express, que em alguns
// casos devolve stack trace pro cliente. Também serve de rede de segurança caso algum next(err)
// apareça em código futuro.
app.use(function(err, req, res, next) {
  console.error(err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(err.status || 500).send('Erro interno do servidor');
});

module.exports = app;