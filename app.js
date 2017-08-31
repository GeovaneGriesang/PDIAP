'use strict';

const express = require('express')
,     path = require('path')
,     favicon = require('serve-favicon')
,     logger = require('morgan')
,     cookieParser = require('cookie-parser')
,     passport = require('passport')
,     session = require('express-session')
,     LocalStrategy = require('passport-local').Strategy
,     expressValidator = require('express-validator')
,     flash = require('connect-flash')
,     bodyParser = require('body-parser')
,     routes = require('./routes/index')
,     projetos = require('./routes/projetos')
,     avaliadores = require('./routes/avaliadores')
,     saberes = require('./routes/saberes-docentes')
,     admin = require('./routes/admin')
,     db = require('./configs/db-config')
,     app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

            // Express Session
            app.use(session({
                secret: 'secret',
                saveUninitialized: true,
                resave: true
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

// Connect Flash
//app.use(flash());

// Global Vars
app.use((req, res, next) => {
  //res.locals.success_msg = req.flash('success_msg');
  //res.locals.error_msg = req.flash('error_msg');
 // res.locals.error = req.flash('error');
  res.locals.user = req.user || null;
  next();
});

app.use('/', routes);
app.use('/projetos', projetos);
app.use('/avaliadores', avaliadores);
app.use('/admin', admin);
app.use('/saberes-docentes', saberes);


          /*// Set Port
          app.set('port', (process.env.PORT || 3000));

          app.listen(app.get('port'), () => {
            console.log('Servidor iniciado em: '+app.get('port'));
          });
          process.on('SIGINT', () => {
            console.log('\tServidor desligado.');
            process.exit(0);
          });*/

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  res.redirect('/404');
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
// if (app.get('env') === 'development') {
//   app.use(function(err, req, res, next) {
//     res.status(err.status || 500);
//     res.render('error', {
//       message: err.message,
//       error: err
//     });
//   });
// }

// // production error handler
// // no stacktraces leaked to user
// app.use(function(err, req, res, next) {
//   res.status(err.status || 500);
//   res.render('error', {
//     message: err.message,
//     error: {}
//   });
// });

module.exports = app;
