'use strict';

// Troca o travessão "–" (en dash, U+2013) por hífen normal "-" no nome de toda
// Escola (e sincroniza o nomeEscola denormalizado em cada projeto vinculado) -
// pedido do usuário depois de ver os nomes migrados com "–" em vez de "-".
//
// Idempotente: escola sem "–" no nome não é tocada.
//
// Uso:
//   node scripts/corrigir-travessao-escolas.js --dry-run
//   node scripts/corrigir-travessao-escolas.js

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('../configs/db-config');
const Projeto = require('../models/projeto-schema');
const Escola = require('../models/escola-schema');

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
	const escolas = await Escola.find({ nome: { $regex: '–' } });
	const relatorio = [];

	for (const escola of escolas) {
		const nomeAntigo = escola.nome;
		const nomeNovo = nomeAntigo.replace(/–/g, '-');
		const countProjetos = await Projeto.count({ $or: [{ escola: escola._id }, { nomeEscola: nomeAntigo }] });
		relatorio.push({ de: nomeAntigo, para: nomeNovo, projetos: countProjetos });
		if (DRY_RUN) continue;
		escola.nome = nomeNovo;
		await escola.save();
		await Projeto.update({ $or: [{ escola: escola._id }, { nomeEscola: nomeAntigo }] }, { $set: { nomeEscola: nomeNovo } }, { multi: true });
	}

	const nomeArquivo = 'scripts/relatorio-corrigir-travessao-escolas' + (DRY_RUN ? '-dry-run' : '') + '.json';
	fs.writeFileSync(path.join(__dirname, '..', nomeArquivo), JSON.stringify(relatorio, null, 2));
	console.log((DRY_RUN ? '[DRY RUN] ' : '') + 'Escolas corrigidas: ' + relatorio.length);
	console.log('Relatório completo em ' + nomeArquivo);
}

mongoose.connection.once('open', () => {
	main()
		.then(() => { mongoose.connection.close(() => process.exit(0)); })
		.catch((err) => {
			console.error(err);
			mongoose.connection.close(() => process.exit(1));
		});
});
