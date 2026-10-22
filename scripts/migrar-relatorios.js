'use strict';

// Relatórios (PDF) dos projetos: de public/relatorios/<numInscricao>.pdf (aberto a qualquer um e
// sobrescrito entre anos - numInscricao se repete) pra uploads/relatorios/<_id do projeto>.pdf
// (utils/relatorioProjeto.js, só sai por rota com permissão).
//
// Uso:
//   node scripts/migrar-relatorios.js --dry-run
//   node scripts/migrar-relatorios.js
//
// Dono de cada arquivo: decidido pelo CONTEÚDO do PDF (utils/textoPdf.js), entre todos os projetos
// com aquele nº - nem o número nem a data servem: o nº se repete entre anos, a data do arquivo em
// produção é a da cópia entre servidores (2026-06) e o arquivo NÃO é sempre do último envio (ex: o
// 22.pdf é do projeto de 2017, não do de 2018 que também marcou envio). Sem confirmação pelo
// conteúdo: não migra e lista como dúvida. Dono que não tinha "relatório enviado" marcado ganha a
// marca (relatorio2). Só COPIA; no fim (fora do --dry-run) a pasta antiga vai inteira pra
// uploads/relatorios-antigos-<data>/ (fora de public/; as dúvidas ficam lá pra conferir à mão).
// Relatório em scripts/relatorio-migracao-relatorios[-dry-run].json.

require('dotenv').config(); // mesmo carregamento de .env que app.js faz
const mongoose = require('mongoose')
,	fs = require('fs')
,	path = require('path')
,	relatorioProjeto = require('../utils/relatorioProjeto')
,	textoPdf = require('../utils/textoPdf');
require('../configs/db-config'); // side effect: abre a conexão padrão (mongoose.connect)

const dryRun = process.argv.includes('--dry-run');
// --origem <pasta>: outra pasta de origem (testes); padrão public/relatorios.
const iOrigem = process.argv.indexOf('--origem');
const ANTIGA = iOrigem > -1 ? path.resolve(process.argv[iOrigem + 1]) : path.join(__dirname, '..', 'public', 'relatorios');
// --ano-duvida <ano>: arquivo que o conteúdo não confirma vai pro projeto desse ano (ver abaixo).
const iAno = process.argv.indexOf('--ano-duvida');
const anoDuvida = iAno > -1 ? parseInt(process.argv[iAno + 1], 10) : null;

(async () => {
	try {
		await mongoose.connection.asPromise();
		const col = mongoose.connection.db.collection('projetos');
		let r = { migrados: [], jaExistiam: [], semDono: [], duvida: [], projetosSemArquivo: 0 };
		let arquivos = fs.existsSync(ANTIGA) ? fs.readdirSync(ANTIGA) : [];
		if (!dryRun) await relatorioProjeto.garantirPasta();
		for (let nome of arquivos) {
			let m = /^(\d+)\.pdf$/i.exec(nome);
			let origem = path.join(ANTIGA, nome);
			if (!m) { r.semDono.push({ arquivo: nome, motivo: 'nome fora do padrão <nº>.pdf' }); continue; }
			let candidatos = await col.find({ numInscricao: Number(m[1]) },
				{ projection: { numInscricao: 1, nomeProjeto: 1, createdAt: 1, relatorio2: 1, 'integrantes.nome': 1 } }).toArray();
			if (!candidatos.length) { r.semDono.push({ arquivo: nome, motivo: 'nenhum projeto com esse nº' }); continue; }
			// Dono pelo CONTEÚDO: fração das palavras do nome do projeto + nomes dos integrantes que
			// aparecem no PDF. Precisa de 50%+ e de folga de 20 pontos sobre o 2º colocado.
			let noPdf = new Set(textoPdf.palavras(textoPdf(fs.readFileSync(origem))));
			let pontua = (p) => {
				let w = [...new Set(textoPdf.palavras(p.nomeProjeto).concat(...(p.integrantes || []).map((i) => textoPdf.palavras(i.nome))))];
				return w.length ? Math.round(100 * w.filter((x) => noPdf.has(x)).length / w.length) : 0;
			};
			let lista = candidatos.map((p) => ({ p: p, pts: pontua(p) })).sort((a, b) => b.pts - a.pts);
			let info = { arquivo: nome, candidatos: candidatos.length, palavrasNoPdf: noPdf.size,
				pontos: lista.map((x) => ({ projeto: String(x.p._id), ano: x.p.createdAt ? new Date(x.p.createdAt).getFullYear() : null, nomeProjeto: x.p.nomeProjeto, marcouEnvio: !!x.p.relatorio2, pontos: x.pts })) };
			let segundo = lista[1] ? lista[1].pts : 0;
			let escolhido = lista[0];
			if (!(lista[0].pts >= 50 && lista[0].pts - segundo >= 20)) {
				// --ano-duvida: todos os arquivos conferidos pelo conteúdo eram de um mesmo ano (o lote que
				// ficou nessa pasta) - quem não dá pra conferir vai pro projeto desse ano, se houver um só.
				let doAno = anoDuvida ? lista.filter((x) => x.p.createdAt && new Date(x.p.createdAt).getFullYear() === anoDuvida) : [];
				if (doAno.length !== 1) { r.duvida.push(info); continue; }
				escolhido = doAno[0];
				info.peloAno = anoDuvida;
			}
			Object.assign(info, { projeto: String(escolhido.p._id), ano: new Date(escolhido.p.createdAt).getFullYear(), nomeProjeto: escolhido.p.nomeProjeto, marcouEnvio: !!escolhido.p.relatorio2 });
			let destino = relatorioProjeto.arquivoDoProjeto(escolhido.p._id);
			if (fs.existsSync(destino)) { r.jaExistiam.push(info); continue; }
			if (!dryRun) {
				await fs.promises.copyFile(origem, destino);
				if (fs.statSync(destino).size !== fs.statSync(origem).size) throw new Error('Cópia incompleta: ' + nome);
				if (!escolhido.p.relatorio2) {
					await col.updateOne({ _id: escolhido.p._id, relatorio2: { $exists: false } }, { $set: { relatorio2: { name: nome, size: fs.statSync(origem).size } } });
				}
			}
			r.migrados.push(info);
		}
		let comRelatorio = await col.find({ 'relatorio2.name': { $exists: true } }, { projection: { _id: 1 } }).toArray();
		let migradosIds = new Set(r.migrados.map((x) => x.projeto));
		r.projetosSemArquivo = comRelatorio.filter((p) => !migradosIds.has(String(p._id)) && !fs.existsSync(relatorioProjeto.arquivoDoProjeto(p._id))).length;

		let destinoAntiga = null;
		if (!dryRun && arquivos.length) {
			destinoAntiga = path.join(__dirname, '..', 'uploads', 'relatorios-antigos-' + new Date().toISOString().slice(0, 10));
			fs.renameSync(ANTIGA, destinoAntiga);
		}

		fs.writeFileSync(path.join(__dirname, 'relatorio-migracao-relatorios' + (dryRun ? '-dry-run' : '') + '.json'), JSON.stringify(r, null, 2));
		console.log((dryRun ? '[DRY RUN] ' : '') + 'Arquivos na pasta antiga: ' + arquivos.length);
		console.log('  migrados: ' + r.migrados.length + ' (confirmados pelo conteúdo: ' + r.migrados.filter((x) => !x.peloAno).length + '; pelo --ano-duvida ' + anoDuvida + ': ' + r.migrados.filter((x) => x.peloAno).length + ')');
		console.log('  dono por ano: ' + JSON.stringify(r.migrados.reduce((a, x) => { a[x.ano] = (a[x.ano] || 0) + 1; return a; }, {})));
		console.log('  já existiam no lugar novo: ' + r.jaExistiam.length);
		console.log('  sem dono: ' + r.semDono.length);
		console.log('  dúvida (não migrados): ' + r.duvida.length);
		let resumo = (x) => x.pontos.map((p) => p.ano + ' ' + p.pontos + '%' + (p.marcouEnvio ? '' : ' (sem envio marcado)')).join(', ');
		r.duvida.forEach((x) => console.log('    ' + x.arquivo + ' (' + x.palavrasNoPdf + ' palavras legíveis): ' + resumo(x)));
		if (process.argv.includes('--detalhes')) {
			r.migrados.forEach((x) => console.log('    ' + x.arquivo + ' -> ' + x.ano + (x.peloAno ? ' (pelo ano)' : '') + ' "' + String(x.nomeProjeto).slice(0, 50) + '" [' + resumo(x) + ']'));
		}
		console.log('  donos sem "relatório enviado" marcado (ganham a marca): ' + r.migrados.filter((x) => !x.marcouEnvio).length);
		console.log('Projetos marcados com relatório enviado que ficam sem arquivo: ' + r.projetosSemArquivo);
		if (destinoAntiga) console.log('Pasta antiga movida para ' + destinoAntiga + ' (fora de public/' + (r.duvida.length ? '; as dúvidas estão lá' : '') + ').');
	} catch (err) {
		console.error('Erro:', err.message);
		process.exitCode = 1;
	} finally {
		await mongoose.disconnect();
	}
})();
