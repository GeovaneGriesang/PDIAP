'use strict';

const mongoose = require('mongoose')
,	dbURL = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/loginapp';

mongoose.connect(dbURL);

// Remove usuário/senha antes de logar a URL (dbURL pode vir de MONGO_URI com credenciais).
const dbURLSemCredenciais = dbURL.replace(/\/\/[^@]+@/, '//');

mongoose.connection.on('connected', () => {
  console.log('<<Mongoose>> conectou em: ' + dbURLSemCredenciais);
});
mongoose.connection.on('error', (err) => {
  console.log('<<Mongoose>> erro ao conectar: ' + err);
});
mongoose.connection.on('disconnected', () => {
  console.log('<<Mongoose>> desconectou.');
});
mongoose.connection.on('open', () => {
  console.log('<<Mongoose>> conexão aberta.');
});

process.on('SIGINT', () => {
  mongoose.connection.close(() => {
    console.log('<<Mongoose>> conexão terminada.');
    process.exit(0);
  });
});
