'use strict';

// Certificados (layout + textos, models/cMostra-schema.js) eram um por ANO. Agora é um por Mostra
// (feiraId). Quando o ano tem uma Mostra só, liga o certificado a ela. Ano com mais de uma Mostra
// (ex: 2026 - X e XI MOVACI): o certificado fica sem Mostra e continua valendo pras Mostras daquele
// ano até cada uma ganhar o seu em Mostra > Certificados (ver
// certificadosService.js#layoutDoCertificado).
//
// Uso:
//   node scripts/migrar-certificados-mostra.js --dry-run
//   node scripts/migrar-certificados-mostra.js

require('dotenv').config(); // mesmo carregamento de .env que app.js faz
const mongoose = require('mongoose');
require('../configs/db-config'); // side effect: abre a conexão padrão (mongoose.connect)

const dryRun = process.argv.includes('--dry-run');

(async () => {
	try {
		await mongoose.connection.asPromise();
		const db = mongoose.connection.db;
		let edicoes = await db.collection('feiras').find({ tipo: 'edicao' }, { projection: { nome: 1, ano: 1 } }).toArray();
		let certs = await db.collection('mostra').find({ feiraId: { $exists: false } }, { projection: { ano_certificado: 1 } }).toArray();
		let ligados = [], doAno = [];
		for (let c of certs) {
			let mostras = edicoes.filter((m) => Number(m.ano) === Number(c.ano_certificado));
			if (mostras.length !== 1) { doAno.push(c.ano_certificado + (mostras.length ? ' (' + mostras.map((m) => m.nome).join(' / ') + ')' : ' (nenhuma Mostra nesse ano)')); continue; }
			if (!dryRun) await db.collection('mostra').updateOne({ _id: c._id, feiraId: { $exists: false } }, { $set: { feiraId: mostras[0]._id } });
			ligados.push(c.ano_certificado + ' -> ' + mostras[0].nome);
		}
		console.log((dryRun ? '[DRY RUN] ' : '') + 'Certificados sem Mostra: ' + certs.length + ' · ligados à Mostra do ano: ' + ligados.length);
		ligados.forEach((x) => console.log('  ' + x));
		console.log('Continuam valendo pro ano todo (cada Mostra cadastra o seu em Mostra > Certificados): ' + doAno.length);
		doAno.forEach((x) => console.log('  ' + x));
	} catch (err) {
		console.error('Erro:', err.message);
		process.exitCode = 1;
	} finally {
		await mongoose.disconnect();
	}
})();
