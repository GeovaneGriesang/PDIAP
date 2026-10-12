'use strict';

// Integrante de projeto que não entra porque o documento é inválido/ausente (não liga ao cadastro
// único): cria a Pessoa SEM documento, só com nome e e-mail, e liga o integrante a ela. A pessoa
// entra com e-mail e senha (cria a senha em "Esqueci minha senha") e, ao entrar, é obrigada a
// informar o documento e a nacionalidade (utils/pendencias.js) - o documento vai então pro projeto.
//
// Só mexe em integrante SEM vínculo, com documento inválido e e-mail que não é de mais ninguém
// (pessoaController.emailLivre). Precisa do índice parcial de documento (scripts/indice-documento-pessoa.js).
//
// Uso:
//   node scripts/cadastrar-integrantes-sem-documento.js --projeto 562 --dry-run
//   node scripts/cadastrar-integrantes-sem-documento.js --projeto 562

require('dotenv').config(); // mesmo carregamento de .env que app.js faz
const mongoose = require('mongoose');
require('../configs/db-config'); // side effect: abre a conexão padrão (mongoose.connect)
const Pessoa = require('../models/pessoa-schema');
const Projeto = require('../models/projeto-schema');
const pessoaController = require('../controllers/pessoa-controller');
const documentoValidator = require('../utils/documentoValidator');
const pendencias = require('../utils/pendencias');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const numero = parseInt(args[args.indexOf('--projeto') + 1], 10);

(async () => {
	try {
		if (!numero) throw new Error('Informe --projeto <número de inscrição>.');
		await mongoose.connection.asPromise();
		let indices = await mongoose.connection.db.collection('pessoas').indexes();
		let idx = indices.find((i) => i.key && i.key.documento === 1);
		if (!idx || !idx.partialFilterExpression) throw new Error('Rode antes scripts/indice-documento-pessoa.js (índice de documento ainda não é parcial).');
		let projeto = await Projeto.findOne({ numInscricao: numero });
		if (!projeto) throw new Error('Projeto #' + numero + ' não encontrado.');
		console.log('#' + numero + ' ' + projeto.nomeProjeto);
		for (let i of projeto.integrantes) {
			let rotulo = '  - ' + i.tipo + ' ' + i.nome + ' <' + (i.email || '-') + '>: ';
			if (i.pessoa) { console.log(rotulo + 'já ligado(a) ao cadastro - nada a fazer.'); continue; }
			if (documentoValidator.validarDocumentoQualquerPais(i.cpf).valido) { console.log(rotulo + 'documento válido - use o fluxo normal (admin > Editar projetos).'); continue; }
			let email = (i.email || '').trim().toLowerCase();
			if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { console.log(rotulo + 'sem e-mail válido - não tem como entrar.'); continue; }
			if (!(await pessoaController.emailLivre(email, null))) { console.log(rotulo + 'e-mail já é de outra conta - não criado.'); continue; }
			let dados = { nome: (i.nome || '').trim(), email: email, telefone: i.telefone };
			if (pendencias.NACIONALIDADES.indexOf(i.nacionalidade) !== -1) dados.nacionalidade = i.nacionalidade;
			if (dryRun) { console.log(rotulo + 'criaria cadastro sem documento e ligaria ao projeto.'); continue; }
			let pessoa = await new Pessoa(dados).save();
			await Projeto.updateOne({ _id: projeto._id, 'integrantes._id': i._id }, { $set: { 'integrantes.$.pessoa': pessoa._id } });
			console.log(rotulo + 'cadastro criado (sem documento) e ligado. Entra pelo "Esqueci minha senha".');
		}
		if (dryRun) console.log('(--dry-run: nada gravado)');
	} catch (err) {
		console.error('Erro:', err.message);
		process.exitCode = 1;
	} finally {
		await mongoose.disconnect();
	}
})();
