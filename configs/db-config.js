'use strict';

const mongoose = require('mongoose')
,	dbURL = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/loginapp';

// Explícito pra não depender do padrão da versão: no mongoose 4 filtros de consulta com
// campos fora do schema eram repassados ao banco, e o código ainda conta com isso.
mongoose.set('strictQuery', false);

// Remove usuário/senha antes de logar a URL (dbURL pode vir de MONGO_URI com credenciais).
const dbURLSemCredenciais = dbURL.replace(/\/\/[^@]+@/, '//');

// connect() devolve uma Promise desde o mongoose 5: sem o .catch, uma falha na conexão
// inicial virava unhandled rejection e derrubava o processo. O erro já sai no
// listener 'error' abaixo.
mongoose.connect(dbURL).catch(() => {});

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

process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('<<Mongoose>> conexão terminada.');
  process.exit(0);
});
