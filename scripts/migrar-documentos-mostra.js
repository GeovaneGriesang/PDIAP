'use strict';

// Documentos antigos (models/documento-schema.js) só tinham o ANO. Agora cada documento é de uma
// Mostra (feiraId): quando o ano tem uma Mostra só, grava ela; anos com mais de uma Mostra (ex: 2026
// - X e XI MOVACI) ficam pra organização escolher em Eventos > Cadastrar Documento (seletor na
// própria linha do documento).
//
// Uso:
//   node scripts/migrar-documentos-mostra.js --dry-run
//   node scripts/migrar-documentos-mostra.js

require('dotenv').config(); // mesmo carregamento de .env que app.js faz
const mongoose = require('mongoose');
require('../configs/db-config'); // side effect: abre a conexão padrão (mongoose.connect)

const dryRun = process.argv.includes('--dry-run');

(async () => {
	try {
		await mongoose.connection.asPromise();
		const db = mongoose.connection.db;
		let edicoes = await db.collection('feiras').find({ tipo: 'edicao' }, { projection: { nome: 1, ano: 1 } }).toArray();
		let docs = await db.collection('documentos').find({ feiraId: { $exists: false } }, { projection: { titulo: 1, ano: 1, exibe: 1 } }).toArray();
		let gravados = 0, escolher = [];
		for (let d of docs) {
			let doAno = edicoes.filter((m) => m.ano === d.ano);
			if (doAno.length !== 1) { escolher.push(d.ano + ' - ' + d.titulo + (d.exibe ? ' [exibido]' : '') + ' (' + (doAno.length ? doAno.map((m) => m.nome).join(' / ') : 'nenhuma Mostra nesse ano') + ')'); continue; }
			if (!dryRun) await db.collection('documentos').updateOne({ _id: d._id, feiraId: { $exists: false } }, { $set: { feiraId: doAno[0]._id } });
			gravados++;
		}
		console.log((dryRun ? '[DRY RUN] ' : '') + 'Documentos sem Mostra: ' + docs.length + ' · Mostra gravada (ano com uma Mostra só): ' + gravados);
		console.log('Para escolher na tela (Eventos > Cadastrar Documento): ' + escolher.length);
		escolher.forEach((x) => console.log('  ' + x));
	} catch (err) {
		console.error('Erro:', err.message);
		process.exitCode = 1;
	} finally {
		await mongoose.disconnect();
	}
})();
