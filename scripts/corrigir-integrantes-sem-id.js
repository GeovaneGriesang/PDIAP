'use strict';

// Integrante de projeto gravado SEM _id de subdocumento (registros antigos, 2017/2018): o Mongoose
// inventa um _id novo a cada leitura, então a emissão de certificado (inserirToken em
// routes/index.js#/emitirCertificado, que filtra por integrantes._id) nunca acha o integrante e o
// certificado nunca sai. Grava um _id de verdade em cada um.
//
// Uso:
//   node scripts/corrigir-integrantes-sem-id.js --dry-run
//   node scripts/corrigir-integrantes-sem-id.js
//
// Só toca em integrante sem _id (pela posição, conferindo que continua sem _id na hora de gravar).
// Lembrete: certificado de estudante também exige presença confirmada (Projetos > Presença).

require('dotenv').config(); // mesmo carregamento de .env que app.js faz
const mongoose = require('mongoose');
require('../configs/db-config'); // side effect: abre a conexão padrão (mongoose.connect)

const dryRun = process.argv.includes('--dry-run');

(async () => {
	try {
		await mongoose.connection.asPromise();
		const col = mongoose.connection.db.collection('projetos');
		let projetos = await col.find({ integrantes: { $elemMatch: { _id: { $exists: false } } } }, { projection: { numInscricao: 1, nomeProjeto: 1, integrantes: 1 } }).toArray();
		let corrigidos = 0;
		for (let p of projetos) {
			for (let k = 0; k < p.integrantes.length; k++) {
				let i = p.integrantes[k];
				if (i._id) continue;
				let rotulo = '#' + p.numInscricao + ' ' + i.tipo + ' ' + i.nome + ' (posição ' + k + ')' + (i.tipo === 'Aluno' && i.presenca !== true ? ' - ATENÇÃO: sem presença marcada, certificado de estudante continua não saindo' : '');
				if (dryRun) { console.log('Corrigiria: ' + rotulo); continue; }
				let r = await col.updateOne(
					{ _id: p._id, ['integrantes.' + k + '._id']: { $exists: false }, ['integrantes.' + k + '.nome']: i.nome },
					{ $set: { ['integrantes.' + k + '._id']: new mongoose.Types.ObjectId() } }
				);
				if (r.modifiedCount) corrigidos++;
				console.log((r.modifiedCount ? 'Corrigido: ' : 'NÃO corrigido (mudou enquanto rodava): ') + rotulo);
			}
		}
		console.log(dryRun ? '(--dry-run: nada gravado)' : 'Total corrigido: ' + corrigidos);
	} catch (err) {
		console.error('Erro:', err.message);
		process.exitCode = 1;
	} finally {
		await mongoose.disconnect();
	}
})();
