'use strict';

// Migração pra frente "seleção de Mostra por edição, não por ano" (ver memória
// project-mostra-ano-nao-unico). Preenche `feiraId` (ref pra Feira tipo:'edicao') em
// Projeto/Avaliador/Participante existentes, a partir do ano calculado de `createdAt` -
// mesma regra que o sistema já usa hoje pra decidir "de qual ano é este registro".
//
// Só grava quando existir exatamente UMA Feira tipo:'edicao' pro ano do registro (caso
// seguro, sem ambiguidade). Quando existem 0 ou 2+ Feiras pro mesmo ano, não adivinha -
// registra no relatório de divergências pra resolução manual depois.
//
// Idempotente: registros que já têm `feiraId` setado são pulados, então rodar de novo é
// seguro.
//
// Uso:
//   node scripts/migrar-feiraId.js --dry-run   (só imprime o que faria, não grava nada)
//   node scripts/migrar-feiraId.js             (roda de verdade)
//
// Antes de rodar em produção: back-up (mongodump) primeiro e aprovação explícita separada
// do deploy do código (mesma cautela usada em scripts/migrar-pessoas.js).

require('dotenv').config(); // mesmo carregamento de .env que app.js faz

const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
require('../configs/db-config'); // side effect: abre a conexão padrão (mongoose.connect)
const Projeto = require('../models/projeto-schema');
const Avaliador = require('../models/avaliador-schema');
const Participante = require('../models/participante-schema');
const Feira = require('../models/feira-schema');

const DRY_RUN = process.argv.includes('--dry-run');

async function migrarModelo(Model, nomeModelo, edicoesPorAno, divergencias, resumo) {
	const registros = await Model.find({ feiraId: { $exists: false } }, '_id createdAt');

	for (const registro of registros) {
		if (!registro.createdAt) {
			resumo.semCreatedAt++;
			continue;
		}
		const ano = new Date(registro.createdAt).getFullYear();
		const edicoes = edicoesPorAno.get(ano) || [];

		if (edicoes.length === 1) {
			if (DRY_RUN) {
				console.log(`[dry-run] ${nomeModelo} ${registro._id} (ano ${ano}) -> feiraId=${edicoes[0]._id} (${edicoes[0].nome})`);
			} else {
				registro.feiraId = edicoes[0]._id;
				await registro.save();
			}
			resumo.migrados++;
		} else {
			divergencias.push({
				modelo: nomeModelo,
				id: registro._id.toString(),
				ano,
				motivo: edicoes.length === 0 ? 'nenhuma Feira tipo:edicao encontrada pro ano' : 'mais de uma Feira tipo:edicao no mesmo ano',
				edicoesCandidatas: edicoes.map((e) => ({ id: e._id.toString(), nome: e.nome }))
			});
			resumo.ambiguos++;
		}
	}
}

async function migrar() {
	const feiras = await Feira.find({ tipo: 'edicao' }, '_id nome ano');
	const edicoesPorAno = new Map();
	for (const feira of feiras) {
		if (!edicoesPorAno.has(feira.ano)) edicoesPorAno.set(feira.ano, []);
		edicoesPorAno.get(feira.ano).push(feira);
	}

	const divergencias = [];
	const resumo = { migrados: 0, ambiguos: 0, semCreatedAt: 0 };

	await migrarModelo(Projeto, 'Projeto', edicoesPorAno, divergencias, resumo);
	await migrarModelo(Avaliador, 'Avaliador', edicoesPorAno, divergencias, resumo);
	await migrarModelo(Participante, 'Participante', edicoesPorAno, divergencias, resumo);

	console.log('\n--- Resumo da migração' + (DRY_RUN ? ' (dry-run, nada foi gravado)' : '') + ' ---');
	console.log('Registros migrados (feiraId preenchido):', resumo.migrados);
	console.log('Registros ambíguos (não migrados, ver relatório):', resumo.ambiguos);
	console.log('Registros sem createdAt (não migrados):', resumo.semCreatedAt);

	if (divergencias.length) {
		const relatorioPath = path.join(__dirname, `relatorio-divergencias-feiraId${DRY_RUN ? '-dry-run' : ''}.json`);
		fs.writeFileSync(relatorioPath, JSON.stringify(divergencias, null, 2));
		console.log('Relatório de divergências salvo em', relatorioPath);
	}
}

mongoose.connection.once('open', () => {
	migrar()
		.then(() => {
			console.log('\nMigração concluída.');
			mongoose.connection.close().then(() => process.exit(0));
		})
		.catch((err) => {
			console.error('Erro na migração:', err);
			mongoose.connection.close().then(() => process.exit(1));
		});
});
