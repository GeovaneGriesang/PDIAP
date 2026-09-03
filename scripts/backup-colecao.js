'use strict';

// Backup simples de uma coleção inteira pra JSON, antes de rodar algo destrutivo -
// mongodump não está disponível no servidor de produção, então isso serve como
// alternativa restaurável (um insertMany a partir do JSON reverte).
//
// Uso: node scripts/backup-colecao.js <nomeDoModelo>
// Ex.:  node scripts/backup-colecao.js avaliador-schema

require('dotenv').config();

const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
require('../configs/db-config');

const nomeModelo = process.argv[2];
if (!nomeModelo) {
	console.error('Uso: node scripts/backup-colecao.js <nomeDoArquivoDeModelo, ex: avaliador-schema>');
	process.exit(1);
}

const Model = require('../models/' + nomeModelo);

mongoose.connection.once('open', function() {
	Model.find({}).lean().then(function(docs) {
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const outPath = path.join(__dirname, `backup-${nomeModelo}-${timestamp}.json`);
		fs.writeFileSync(outPath, JSON.stringify(docs, null, 2));
		console.log(`Backup de ${docs.length} documento(s) salvo em ${outPath}`);
		mongoose.connection.close(function() { process.exit(0); });
	}).catch(function(err) {
		console.error('Erro no backup:', err);
		mongoose.connection.close(function() { process.exit(1); });
	});
});
