'use strict';

// Migração pra frente "Seminário genérico" (ver memória project-seminario-saberes-docentes).
// O tipo fixo "Seminário Saberes Docentes" (um dos 4 valores de Evento.tipo) vira o tipo
// genérico "Seminário" + um vínculo com um novo documento Seminario{nome:'Saberes Docentes'} -
// isso abre caminho pra outros seminários no futuro sem inventar um novo tipo fixo cada vez, e
// permite calcular percentual de frequência (frequentadas / total de palestras do Seminário).
//
// Duas partes com risco bem diferente:
//
// 1) Troca da string `tipo` em Evento e em cada entrada de Participante.eventos - SEMPRE segura,
//    SEMPRE aplicada, mesmo em casos ambíguos. Não existe hoje nenhum outro significado possível
//    pra "Seminário Saberes Docentes" - deixar sobras da string antiga no banco depois do código
//    renomeado faria esses participantes parecerem sem nenhuma frequência (pior que cair no
//    fallback de 100%, ver utils/certificadoSeminario.js).
//
// 2) Ligação de cada Evento a um Seminario (por grupo: feiraId, ou ano de createdAt quando não
//    houver feiraId) e de cada entrada de Participante.eventos ao Evento original (por
//    titulo+cargaHoraria exatos dentro do mesmo grupo) - só essa parte é genuinamente ambígua.
//    1 candidato único liga com confiança; 0 ou 2+ candidatos fica sem eventoId/seminarioId
//    (cai no fallback de 100% automaticamente) e vai pro relatório de divergências, sem
//    adivinhar.
//
// Agnóstico de ano - agrupa por feiraId/ano calculado, serve pra todos os anos que tiverem esse
// tipo de evento, não só 2016.
//
// Idempotente: a busca usa sempre a string antiga ("Seminário Saberes Docentes") - documentos já
// migrados (tipo='Seminário') simplesmente não aparecem numa segunda rodada.
//
// Uso:
//   node scripts/migrar-seminario-saberes-docentes.js --dry-run   (só imprime, não grava nada)
//   node scripts/migrar-seminario-saberes-docentes.js             (roda de verdade)
//
// Antes de rodar em produção: back-up (mongodump) primeiro, e o deploy do código renomeado
// (que passa a comparar tipo === 'Seminário') precisa acontecer na mesma janela - ver aviso no
// plano da frente.

require('dotenv').config();

const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
require('../configs/db-config');
const Evento = require('../models/evento-schema');
const Participante = require('../models/participante-schema');
const Seminario = require('../models/seminario-schema');

const DRY_RUN = process.argv.includes('--dry-run');
const TIPO_ANTIGO = 'Seminário Saberes Docentes';
const TIPO_NOVO = 'Seminário';

function chaveDoGrupo(feiraId, createdAt) {
	if (feiraId) return 'feira:' + feiraId.toString();
	if (createdAt) return 'ano:' + new Date(createdAt).getFullYear();
	return null; // sem feiraId e sem createdAt - não dá pra agrupar com segurança
}

async function migrarEventos(divergencias, resumo) {
	const eventos = await Evento.find({ tipo: TIPO_ANTIGO });

	// Agrupa por escopo (feiraId ou ano) - cada grupo vira UM Seminario "Saberes Docentes".
	const grupos = new Map();
	for (const evento of eventos) {
		const chave = chaveDoGrupo(evento.feiraId, evento.createdAt);
		if (!chave) {
			divergencias.push({ tipo: 'Evento', id: evento._id.toString(), motivo: 'sem feiraId e sem createdAt, não dá pra agrupar' });
			resumo.eventosSemEscopo++;
			continue;
		}
		if (!grupos.has(chave)) grupos.set(chave, { feiraId: evento.feiraId, ano: evento.createdAt ? new Date(evento.createdAt).getFullYear() : undefined, eventos: [] });
		grupos.get(chave).eventos.push(evento);
	}

	// Mapa chave-do-grupo -> Seminario (criado ou reaproveitado), devolvido pra uso na migração
	// de Participante.eventos.
	const seminarioPorGrupo = new Map();

	for (const [chave, grupo] of grupos) {
		let seminario = await Seminario.findOne({ nome: 'Saberes Docentes', feiraId: grupo.feiraId || { $exists: false } });
		if (!seminario) {
			if (DRY_RUN) {
				console.log(`[dry-run] criaria Seminario "Saberes Docentes" pro grupo ${chave} (${grupo.eventos.length} eventos)`);
				seminario = { _id: 'DRY-RUN-' + chave }; // placeholder só pra log/relatório em dry-run
			} else {
				seminario = await Seminario.create({
					nome: 'Saberes Docentes',
					feiraId: grupo.feiraId,
					// Sem feiraId, precisa de createdAt no ano certo pra adminAPI.pertenceAMostra
					// continuar funcionando (mesmo truque já usado em eventosCtrl.js#cadastrarEvento).
					createdAt: grupo.ano ? new Date(new Date().setFullYear(grupo.ano)) : new Date()
				});
			}
			resumo.seminariosCriados++;
		}
		seminarioPorGrupo.set(chave, seminario);

		for (const evento of grupo.eventos) {
			if (DRY_RUN) {
				console.log(`[dry-run] Evento ${evento._id} (${evento.titulo}) -> tipo='${TIPO_NOVO}', seminarioId=${seminario._id}`);
			} else {
				evento.tipo = TIPO_NOVO;
				evento.seminarioId = seminario._id;
				await evento.save();
			}
			resumo.eventosMigrados++;
		}
	}

	return { grupos, seminarioPorGrupo };
}

async function migrarParticipantes(grupos, seminarioPorGrupo, divergencias, resumo) {
	const participantes = await Participante.find({ 'eventos.tipo': TIPO_ANTIGO });

	for (const participante of participantes) {
		const chave = chaveDoGrupo(participante.feiraId, participante.createdAt);
		const grupo = chave ? grupos.get(chave) : undefined;
		const seminario = chave ? seminarioPorGrupo.get(chave) : undefined;

		let algumaMudanca = false;

		participante.eventos.forEach((entrada, indice) => {
			if (entrada.tipo !== TIPO_ANTIGO) return;
			algumaMudanca = true;
			entrada.tipo = TIPO_NOVO; // sempre renomeia, mesmo sem conseguir ligar (ver cabeçalho)

			if (!grupo) {
				divergencias.push({ tipo: 'Participante.eventos', participanteId: participante._id.toString(), indice, titulo: entrada.titulo, cargaHoraria: entrada.cargaHoraria, motivo: 'sem grupo de Eventos correspondente (feiraId/ano do participante não bate com nenhum grupo migrado)' });
				resumo.entradasSemGrupo++;
				return;
			}

			const candidatos = grupo.eventos.filter((e) => e.titulo === entrada.titulo && e.cargaHoraria === entrada.cargaHoraria);
			if (candidatos.length === 1) {
				entrada.eventoId = candidatos[0]._id;
				entrada.seminarioId = seminario._id;
				resumo.entradasLigadas++;
			} else {
				divergencias.push({
					tipo: 'Participante.eventos',
					participanteId: participante._id.toString(),
					indice,
					titulo: entrada.titulo,
					cargaHoraria: entrada.cargaHoraria,
					motivo: candidatos.length === 0 ? 'nenhum Evento do grupo bate com titulo+cargaHoraria' : 'mais de um Evento do grupo bate com titulo+cargaHoraria',
					candidatos: candidatos.map((c) => ({ id: c._id.toString(), titulo: c.titulo, cargaHoraria: c.cargaHoraria }))
				});
				resumo.entradasAmbiguas++;
			}
		});

		if (algumaMudanca) {
			if (DRY_RUN) {
				console.log(`[dry-run] Participante ${participante._id} (${participante.nome}) - eventos atualizados em memória, não gravado`);
			} else {
				await participante.save();
			}
			resumo.participantesTocados++;
		}
	}
}

async function migrar() {
	const divergencias = [];
	const resumo = {
		eventosMigrados: 0, eventosSemEscopo: 0, seminariosCriados: 0,
		participantesTocados: 0, entradasLigadas: 0, entradasAmbiguas: 0, entradasSemGrupo: 0
	};

	const { grupos, seminarioPorGrupo } = await migrarEventos(divergencias, resumo);
	await migrarParticipantes(grupos, seminarioPorGrupo, divergencias, resumo);

	console.log('\n--- Resumo da migração' + (DRY_RUN ? ' (dry-run, nada foi gravado)' : '') + ' ---');
	console.log('Seminarios criados:', resumo.seminariosCriados);
	console.log('Eventos migrados (tipo + seminarioId):', resumo.eventosMigrados);
	console.log('Eventos sem escopo (não migrados, ver relatório):', resumo.eventosSemEscopo);
	console.log('Participantes tocados:', resumo.participantesTocados);
	console.log('Entradas de Participante.eventos ligadas com confiança (eventoId+seminarioId):', resumo.entradasLigadas);
	console.log('Entradas ambíguas (tipo renomeado, sem ligação - cai no fallback de 100%):', resumo.entradasAmbiguas);
	console.log('Entradas sem grupo correspondente (tipo renomeado, sem ligação - cai no fallback de 100%):', resumo.entradasSemGrupo);

	if (divergencias.length) {
		const relatorioPath = path.join(__dirname, `relatorio-divergencias-seminario-saberes-docentes${DRY_RUN ? '-dry-run' : ''}.json`);
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
