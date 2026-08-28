'use strict';
require('dotenv').config();
const mongoose = require('mongoose');
require('../configs/db-config');
const Projeto = require('../models/projeto-schema');

mongoose.connection.once('open', async () => {
	const projetos = await Projeto.find({ nomeEscola: 'IFSul' });
	console.log('Encontrados: ' + projetos.length);
	projetos.forEach((p) => console.log(JSON.stringify(p, null, 2)));
	mongoose.connection.close(() => process.exit(0));
});
