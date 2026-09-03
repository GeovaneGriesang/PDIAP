'use strict';

// Mescla avaliadores duplicados (mesma pessoa cadastrada mais de uma vez, porque antes
// não dava pra escolher mais de uma combinação categoria+eixo num só cadastro - cada
// combinação virava um cadastro novo). Agora que avaliador.categoriasEixos é um array,
// junta tudo num registro só por pessoa.
//
// Agrupamento: por CPF normalizado (só dígitos), não-vazio - é o identificador mais
// confiável disponível (nome varia em acentuação/maiúsculas entre cadastros da mesma
// pessoa, ver marcarDuplicados() em public/admin/assets/js/controllers/avaliadoresCtrl.js,
// que usa nome OU cpf mas só dentro de um ano por vez).
//
// Dentro de cada grupo:
// - Registro "mantido": o que já tem senha definida (senhaDefinida:true - nunca descarta
//   uma identidade de login já em uso); se nenhum tiver, o de createdAt mais recente.
// - categoriasEixos / categoriasEixosAvaliados / disponibilidade: união de todos os
//   registros do grupo, sem duplicar combinação repetida.
// - avaliacao: true se qualquer um dos registros do grupo já foi marcado como avaliado.
// - Campos simples (nome, email, telefone, rg, dtNascimento, nivelAcademico,
//   atuacaoProfissional, tempoAtuacao, curriculo, nacionalidade): usa o do mantido; se
//   vazio, busca o primeiro valor não-vazio entre os outros do grupo (do mais recente
//   pro mais antigo).
// - Os demais registros do grupo são removidos depois de mesclados.
//
// Grupos com MAIS DE UM registro com senhaDefinida:true não são mesclados automaticamente
// (não dá pra saber qual login a pessoa realmente usa) - ficam de fora do relatório
// principal, listados à parte em "precisamRevisaoManual", pra decisão manual.
//
// Uso:
//   node scripts/mesclar-avaliadores-duplicados.js --dry-run   (só imprime o que faria)
//   node scripts/mesclar-avaliadores-duplicados.js             (roda de verdade)
//
// Antes de rodar em produção: back-up (mongodump) primeiro.

require('dotenv').config();

const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
require('../configs/db-config');
const Avaliador = require('../models/avaliador-schema');

const DRY_RUN = process.argv.includes('--dry-run');

function apenasDigitos(valor) {
	return (valor || '').toString().replace(/\D+/g, '');
}

function chavePar(ce) {
	return (ce.categoria || '') + '|' + (ce.eixo || '');
}

function unirCategoriasEixos(registros, campo) {
	const vistos = new Set();
	const resultado = [];
	registros.forEach(function(r) {
		(r[campo] || []).forEach(function(ce) {
			const chave = chavePar(ce);
			if (!vistos.has(chave)) {
				vistos.add(chave);
				resultado.push({ categoria: ce.categoria, eixo: ce.eixo });
			}
		});
	});
	return resultado;
}

function unirDisponibilidade(registros) {
	const vistos = new Set();
	const resultado = [];
	registros.forEach(function(r) {
		(r.disponibilidade || []).forEach(function(dt) {
			const chave = (dt.data || '') + '|' + (dt.turno || '');
			if (!vistos.has(chave)) {
				vistos.add(chave);
				resultado.push({ data: dt.data, turno: dt.turno });
			}
		});
	});
	return resultado;
}

// Primeiro valor não-vazio entre os registros (já ordenados do mais recente pro mais
// antigo), pra preencher um campo simples que ficou vazio no registro mantido.
function primeiroPreenchido(registrosOrdenados, campo) {
	for (const r of registrosOrdenados) {
		if (r[campo]) return r[campo];
	}
	return undefined;
}

const CAMPOS_SIMPLES = ['nome', 'email', 'telefone', 'rg', 'dtNascimento', 'nivelAcademico', 'atuacaoProfissional', 'tempoAtuacao', 'curriculo', 'nacionalidade'];

async function mesclar() {
	const todos = await Avaliador.find({});

	const porCpf = new Map();
	todos.forEach(function(a) {
		const cpf = apenasDigitos(a.cpf);
		if (!cpf) return;
		if (!porCpf.has(cpf)) porCpf.set(cpf, []);
		porCpf.get(cpf).push(a);
	});

	const grupos = Array.from(porCpf.entries()).filter(function([, regs]) { return regs.length > 1; });

	let mesclados = 0, removidos = 0;
	const resumo = [];
	const precisamRevisaoManual = [];

	for (const [cpf, registros] of grupos) {
		const comSenha = registros.filter(function(r) { return r.senhaDefinida === true; });
		if (comSenha.length > 1) {
			precisamRevisaoManual.push({
				cpf: cpf,
				motivo: 'mais de um registro com senha já definida',
				registros: registros.map(function(r) { return { id: r._id.toString(), nome: r.nome, email: r.email, createdAt: r.createdAt }; })
			});
			continue;
		}

		const ordenados = registros.slice().sort(function(a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
		const mantido = comSenha[0] || ordenados[0];
		const outros = registros.filter(function(r) { return r._id.toString() !== mantido._id.toString(); });
		const ordenadosParaBackfill = ordenados.filter(function(r) { return r._id.toString() !== mantido._id.toString(); });

		const categoriasEixosNovo = unirCategoriasEixos(registros, 'categoriasEixos');
		const categoriasEixosAvaliadosNovo = unirCategoriasEixos(registros, 'categoriasEixosAvaliados');
		const disponibilidadeNovo = unirDisponibilidade(registros);
		const avaliacaoNovo = mantido.avaliacao === true || registros.some(function(r) { return r.avaliacao === true; });

		const atualizacoes = {
			categoriasEixos: categoriasEixosNovo,
			categoriasEixosAvaliados: categoriasEixosAvaliadosNovo,
			disponibilidade: disponibilidadeNovo,
			avaliacao: avaliacaoNovo
		};
		CAMPOS_SIMPLES.forEach(function(campo) {
			if (!mantido[campo]) {
				const preenchido = primeiroPreenchido(ordenadosParaBackfill, campo);
				if (preenchido) atualizacoes[campo] = preenchido;
			}
		});

		resumo.push({
			cpf: cpf,
			mantidoId: mantido._id.toString(),
			mantidoNome: atualizacoes.nome || mantido.nome,
			registrosRemovidos: outros.map(function(r) { return { id: r._id.toString(), nome: r.nome, createdAt: r.createdAt }; }),
			categoriasEixosAntes: registros.map(function(r) { return (r.categoriasEixos || []).length; }),
			categoriasEixosDepois: categoriasEixosNovo.length,
			disponibilidadeDepois: disponibilidadeNovo.length
		});

		if (DRY_RUN) {
			console.log(`[dry-run] CPF ${cpf}: manteria ${mantido._id} (${atualizacoes.nome || mantido.nome}), removeria ${outros.length} registro(s), categoriasEixos ${registros.map(function(r){return (r.categoriasEixos||[]).length;}).join('+')} -> ${categoriasEixosNovo.length}`);
		} else {
			await Avaliador.updateOne({ _id: mantido._id }, { $set: atualizacoes });
			for (const r of outros) {
				await Avaliador.deleteOne({ _id: r._id });
			}
		}
		mesclados++;
		removidos += outros.length;
	}

	console.log('\n--- Resumo da mesclagem' + (DRY_RUN ? ' (dry-run, nada foi gravado)' : '') + ' ---');
	console.log('Total de avaliadores:', todos.length);
	console.log('Grupos de CPF duplicado encontrados:', grupos.length);
	console.log('Grupos mesclados:', mesclados);
	console.log('Registros removidos (mesclados no principal):', removidos);
	console.log('Grupos que precisam revisão manual (mais de uma senha já definida):', precisamRevisaoManual.length);

	const sufixo = DRY_RUN ? '-dry-run' : '';
	const relatorioPath = path.join(__dirname, `relatorio-mesclagem-avaliadores${sufixo}.json`);
	fs.writeFileSync(relatorioPath, JSON.stringify({ resumo: resumo, precisamRevisaoManual: precisamRevisaoManual }, null, 2));
	console.log('Relatório salvo em', relatorioPath);
}

mongoose.connection.once('open', function() {
	mesclar()
		.then(function() {
			console.log('\nMesclagem concluída.');
			mongoose.connection.close(function() { process.exit(0); });
		})
		.catch(function(err) {
			console.error('Erro na mesclagem:', err);
			mongoose.connection.close(function() { process.exit(1); });
		});
});
