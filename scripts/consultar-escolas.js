'use strict';

// Script de consulta (só leitura, não grava nada) - usado pra investigar antes de
// decidir uma correção pontual de dados de escolas. Lista TODAS as escolas
// (qualquer status) e, opcionalmente, os projetos vinculados a cada uma que bater
// num filtro de nome.
//
// Uso: node scripts/consultar-escolas.js "trecho do nome"

require('dotenv').config();

const mongoose = require('mongoose');
require('../configs/db-config');
const Projeto = require('../models/projeto-schema');
const Escola = require('../models/escola-schema');

const filtro = process.argv[2];

async function main() {
	const query = filtro ? { nome: { $regex: filtro, $options: 'i' } } : {};
	const escolas = await Escola.find(query).sort({ nome: 1 });
	console.log('Escolas encontradas: ' + escolas.length);
	for (const esc of escolas) {
		console.log('---');
		console.log('nome: ' + esc.nome);
		console.log('_id: ' + esc._id + ' | status: ' + esc.status + ' | origem: ' + esc.origem + ' | cidade: ' + esc.cidade + '/' + esc.estado);
		const projetos = await Projeto.find({ $or: [{ escola: esc._id }, { nomeEscola: esc.nome }] }, 'numInscricao nomeProjeto createdAt cidade');
		projetos.forEach((p) => {
			console.log('  projeto Nº ' + p.numInscricao + ' (' + new Date(p.createdAt).getFullYear() + ') - ' + p.nomeProjeto + ' - cidade: ' + p.cidade);
		});
	}
}

mongoose.connection.once('open', () => {
	main()
		.then(() => { mongoose.connection.close(() => process.exit(0)); })
		.catch((err) => {
			console.error(err);
			mongoose.connection.close(() => process.exit(1));
		});
});
