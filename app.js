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
      LocalStrategy = require('passport-local').Strategy,
      expressValidator = require('express-validator'),
      //flash = require('connect-flash'),
      bodyParser = require('body-parser'),
      routes = require('./routes/index'),
      projetos = require('./routes/projetos'),
      avaliadores = require('./routes/avaliadores'),
      saberes = require('./routes/saberes-docentes'),
      admin = require('./routes/admin'),
      db = require('./configs/db-config'),
      app = express();

/**
 * PDIAP - Fase 6: Integração da Manutenção Automática
 * * Funcionamento Geral:
 * Importa o script de correção e o executa após a conexão com o banco ser estabilizada.
 * * Alterado por: Geovane Griesang
 * Data: 07/04/2026
 * Descrição: Chamada da rotina de manutenção para a coleção avaliadores.
 */
const { corrigirTokensCertificados } = require('./fixTokens');

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
app.use(session({
    secret: process.env.SESSION_SECRET,
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
app.use('/admin', admin);
app.use('/saberes-docentes', saberes);

// Manutenção preventiva da MOVACI 2026
// Aguarda o carregamento do db-config para garantir conexão ativa
setTimeout(() => {
    corrigirTokensCertificados().catch(err => console.error(err));
}, 3000);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  res.redirect('/404');
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

module.exports = app;