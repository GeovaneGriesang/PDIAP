'use strict';

// Projeto APROVADO e AVALIADO (tem nota) em que NENHUM integrante tem presença marcada: o grupo
// apresentou (foi avaliado), mas a presença nunca foi marcada - e o certificado de aluno(a) exige
// presença (routes/index.js#emitirCertificado). Regra da organização (2026-10-23): esse caso é
// erro; marca a presença de todo o grupo. Grupo com pelo menos uma presença foi conferido por
// alguém e NÃO é tocado; sem nota e sem presença também não.
// Também confirma a participação do projeto (participa:true), como já faz o lançamento de nota.
//
// Uso:
//   node scripts/marcar-presenca-avaliados.js --dry-run
//   node scripts/marcar-presenca-avaliados.js
//   node scripts/marcar-presenca-avaliados.js --excluir "X MOVACI"   (deixa uma Mostra de fora, pelo nome)
// Lista em scripts/relatorio-marcar-presenca[-dry-run].json (nº, projeto, Mostra, integrantes).

require('dotenv').config(); // mesmo carregamento de .env que app.js faz
const mongoose = require('mongoose')
,	fs = require('fs')
,	path = require('path');
require('../configs/db-config'); // side effect: abre a conexão padrão (mongoose.connect)

const dryRun = process.argv.includes('--dry-run');
const iExcluir = process.argv.indexOf('--excluir');
const excluir = iExcluir > -1 ? String(process.argv[iExcluir + 1] || '').trim().toLowerCase() : null;

(async () => {
	try {
		await mongoose.connection.asPromise();
		const db = mongoose.connection.db;
		let filtro = { aprovado: true, 'avaliacao.0': { $exists: true }, integrantes: { $not: { $elemMatch: { presenca: true } } }, 'integrantes.0': { $exists: true } };
		let mostras = new Map((await db.collection('feiras').find({ tipo: 'edicao' }, { projection: { nome: 1, ano: 1 } }).toArray()).map((m) => [String(m._id), m.ano + ' - ' + m.nome]));
		let fora = excluir ? (await db.collection('feiras').find({ tipo: 'edicao' }, { projection: { nome: 1 } }).toArray()).filter((m) => String(m.nome || '').trim().toLowerCase() === excluir).map((m) => m._id) : [];
		if (excluir && !fora.length) throw new Error('Nenhuma Mostra com o nome "' + excluir + '" - confira o nome.');
		if (fora.length) { filtro.feiraId = { $nin: fora }; console.log('Deixando de fora: ' + excluir); }
		let projetos = await db.collection('projetos').find(filtro, { projection: { numInscricao: 1, nomeProjeto: 1, feiraId: 1, createdAt: 1, avaliacao: 1, integrantes: 1 } }).toArray();
		let porMostra = {}, marcados = 0, pessoas = 0, alunos = 0, lista = [];
		for (let p of projetos) {
			let mostra = mostras.get(String(p.feiraId)) || ((p.createdAt ? new Date(p.createdAt).getFullYear() : '?') + ' - (sem Mostra)');
			let item = { mostra: mostra, numInscricao: p.numInscricao, nomeProjeto: p.nomeProjeto, notas: p.avaliacao,
				integrantes: (p.integrantes || []).map((i) => i.tipo + ': ' + i.nome) };
			if (!dryRun) {
				// Confere de novo na hora de gravar: se alguém marcou presença enquanto rodava, não mexe.
				let r = await db.collection('projetos').updateOne(Object.assign({ _id: p._id }, { integrantes: { $not: { $elemMatch: { presenca: true } } } }),
					{ $set: { 'integrantes.$[].presenca': true, participa: true, updatedAt: new Date() } });
				if (!r.modifiedCount) { item.pulado = 'alguém marcou presença enquanto rodava'; lista.push(item); continue; }
			}
			marcados++;
			pessoas += (p.integrantes || []).length;
			alunos += (p.integrantes || []).filter((i) => i.tipo === 'Aluno').length;
			porMostra[mostra] = (porMostra[mostra] || 0) + 1;
			lista.push(item);
		}
		lista.sort((a, b) => String(a.mostra).localeCompare(String(b.mostra)) || ((a.numInscricao || 0) - (b.numInscricao || 0)));
		fs.writeFileSync(path.join(__dirname, 'relatorio-marcar-presenca' + (dryRun ? '-dry-run' : '') + '.json'), JSON.stringify(lista, null, 2));
		console.log((dryRun ? '[DRY RUN] ' : '') + 'Projetos avaliados sem nenhuma presença: ' + projetos.length + ' · presença ' + (dryRun ? 'a marcar' : 'marcada') + ' em ' + marcados + ' (' + pessoas + ' integrantes, ' + alunos + ' alunos(as))');
		Object.keys(porMostra).sort().forEach((m) => console.log('  ' + m + ': ' + porMostra[m] + ' projeto(s)'));
		console.log('Lista completa: scripts/relatorio-marcar-presenca' + (dryRun ? '-dry-run' : '') + '.json');
	} catch (err) {
		console.error('Erro:', err.message);
		process.exitCode = 1;
	} finally {
		await mongoose.disconnect();
	}
})();
