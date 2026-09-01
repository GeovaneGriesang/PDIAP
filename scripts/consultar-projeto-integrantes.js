'use strict';
require('dotenv').config();
const mongoose = require('mongoose');
require('../configs/db-config');
const Projeto = require('../models/projeto-schema');

mongoose.connection.once('open', async () => {
	const ano = new Date().getFullYear();
	const projetos = await Projeto.find({}, 'numInscricao nomeProjeto integrantes createdAt').limit(5).sort({ createdAt: -1 });
	projetos.forEach((p) => {
		console.log('Nº ' + p.numInscricao + ' (' + new Date(p.createdAt).getFullYear() + ') - integrantes: ' + p.integrantes.length);
		p.integrantes.forEach((i) => console.log('  - ' + i.tipo + ': ' + i.nome + ' | email: "' + i.email + '"'));
	});
	mongoose.connection.close(() => process.exit(0));
});
