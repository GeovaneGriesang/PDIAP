'use strict';

// Troca o índice único de pessoas.documento pelo índice PARCIAL (único só entre quem tem
// documento - ver models/pessoa-schema.js). O índice antigo exigia o campo em todo mundo: duas
// Pessoas sem documento conflitariam como "null" duplicado.
//
// Uso:
//   node scripts/indice-documento-pessoa.js --dry-run   (só mostra os índices e o que faria)
//   node scripts/indice-documento-pessoa.js
//
// Idempotente: se o índice já é o parcial, não faz nada. Rodar ANTES de criar Pessoa sem
// documento. Entre apagar o antigo e criar o novo (segundos) não há checagem de duplicidade -
// o script confere antes que não existe documento repetido.

require('dotenv').config(); // mesmo carregamento de .env que app.js faz
const mongoose = require('mongoose');
require('../configs/db-config'); // side effect: abre a conexão padrão (mongoose.connect)

const dryRun = process.argv.includes('--dry-run');
const PARCIAL = { documento: { $type: 'string' } };

(async () => {
	try {
		await mongoose.connection.asPromise();
		const col = mongoose.connection.db.collection('pessoas');
		let indices = await col.indexes();
		let atual = indices.find((i) => i.key && Object.keys(i.key).length === 1 && i.key.documento === 1);
		console.log('Índice atual de documento:', atual ? JSON.stringify({ nome: atual.name, unique: !!atual.unique, parcial: atual.partialFilterExpression || null }) : '(nenhum)');
		if (atual && atual.unique && atual.partialFilterExpression && JSON.stringify(atual.partialFilterExpression) === JSON.stringify(PARCIAL)) {
			console.log('Já é o índice parcial. Nada a fazer.');
			return;
		}
		let repetidos = await col.aggregate([{ $match: { documento: { $type: 'string' } } }, { $group: { _id: '$documento', n: { $sum: 1 } } }, { $match: { n: { $gt: 1 } } }]).toArray();
		if (repetidos.length) throw new Error(repetidos.length + ' documento(s) repetido(s) - resolva antes de trocar o índice.');
		let semDocumento = await col.countDocuments({ documento: { $not: { $type: 'string' } } });
		console.log('Pessoas sem documento hoje:', semDocumento);
		if (dryRun) { console.log('(--dry-run) Apagaria ' + (atual ? atual.name : '-') + ' e criaria documento_1 único e parcial.'); return; }
		if (atual) await col.dropIndex(atual.name);
		await col.createIndex({ documento: 1 }, { name: 'documento_1', unique: true, partialFilterExpression: PARCIAL });
		console.log('Feito. Índices agora:', JSON.stringify((await col.indexes()).map((i) => i.name)));
	} catch (err) {
		console.error('Erro:', err.message);
		process.exitCode = 1;
	} finally {
		await mongoose.disconnect();
	}
})();
