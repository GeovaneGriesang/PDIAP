'use strict';

// Consulta só-leitura: procura projetos pelo texto RAW do campo nomeEscola (não passa
// pela coleção Escola), útil pra achar strings que nunca viraram/vincularam a uma
// Escola própria - pode ser um projeto sem link nenhum (escola vazio) ou já vinculado
// mas com nomeEscola desatualizado.
//
// Uso: node scripts/consultar-projetos-nomeescola.js "trecho do nome"

require('dotenv').config();

const mongoose = require('mongoose');
require('../configs/db-config');
const Projeto = require('../models/projeto-schema');

const filtro = process.argv[2];

async function main() {
	const projetos = await Projeto.find({ nomeEscola: { $regex: filtro, $options: 'i' } }, 'numInscricao nomeProjeto nomeEscola escola createdAt cidade');
	console.log('Projetos encontrados: ' + projetos.length);
	projetos.forEach((p) => {
		console.log('Nº ' + p.numInscricao + ' (' + new Date(p.createdAt).getFullYear() + ') - nomeEscola: "' + p.nomeEscola + '" - escola vinculada: ' + (p.escola || '(nenhuma)') + ' - cidade: ' + p.cidade + ' - ' + p.nomeProjeto);
	});
}

mongoose.connection.once('open', () => {
	main()
		.then(() => { mongoose.connection.close(() => process.exit(0)); })
		.catch((err) => {
			console.error(err);
			mongoose.connection.close(() => process.exit(1));
		});
});
