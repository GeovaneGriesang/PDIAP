'use strict';

// Segunda rodada de correção pontual de escolas, depois de descobrir (investigando o
// pedido do usuário) que ~198 projetos nunca foram vinculados na migração original -
// nomeEscola continua com o texto bruto digitado na hora, porque a grafia não batia
// com nenhuma variante em mapeamento-escolas.json. Esse script cobre os casos
// concretos identificados:
//
// 1. Renomeia a Escola já existente "Escola Municipal de Ensino Fundamental Cidade
//    Nova" -> "EMEF Cidade Nova" (padronização pedida pelo usuário).
// 2. Qualquer nomeEscola bruto batendo com um padrão "IFSul/IFRS genérico" (várias
//    grafias de "Instituto Federal de Educação, Ciência e Tecnologia
//    Sul-rio-grandense", "IFSul Câmpus X" sem traço, etc.) em projeto AINDA SEM
//    escola vinculada é resolvido pela cidade do PRÓPRIO projeto contra os câmpus já
//    cadastrados - mesma lógica de scripts/corrigir-escolas-ifsul.js. Sem cidade
//    correspondente, cai no bucket genérico único "IFSul – Não Especificado (Geral /
//    Reitoria)".
// 3. "COOPERATIVA ESCOLAR MAR DE SONHOS..." -> vincula direto à Escola já existente
//    "EEEM Sebastião Jubal Junqueira" (exceção nomeada pelo usuário, não é resolução
//    por cidade).
// 4. "Escola Municipal de Ensino Fundamental Maria Almerinda Paz de Oliveira" -> cria/
//    vincula a Escola "EMEF Maria Almerinda Paz de Oliveira".
//
// NÃO mexe no projeto Nº 406/2025 ("Escola Municipal de Ensino Fundamental", sem
// complemento nenhum) - ambíguo demais pra resolver sozinho, fica registrado no
// relatório pra revisão manual.
//
// Idempotente: projeto que já tem escola vinculada é ignorado nas resoluções por
// nomeEscola bruto (só a Escola "Cidade Nova" é sempre checada pro rename, já que
// ela é achada pelo nome atual, não por vínculo).
//
// Uso:
//   node scripts/corrigir-escolas-padronizacao2.js --dry-run
//   node scripts/corrigir-escolas-padronizacao2.js

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('../configs/db-config');
const Projeto = require('../models/projeto-schema');
const Escola = require('../models/escola-schema');

const DRY_RUN = process.argv.includes('--dry-run');

const NOME_GENERICO_CANONICO = 'IFSul – Não Especificado (Geral / Reitoria)';

// Bate com qualquer grafia razoável de "Instituto Federal ... Sul-(rio-)grandense"
// ou "IFSul"/"IFRS" seguido de "Câmpus"/"Campus" - cobre as variantes reais
// encontradas (com/sem acento, com/sem hífen, maiúsculas variando etc.).
const REGEX_IFSUL_GENERICO = /institu[çc][aã]o.*federal|instituto federal|ifsul|ifrs/i;

const relatorio = {
	renomeadas: [],
	ifsulResolvidoPorCidade: [],
	ifsulSemCidadeCorrespondente: [],
	cooperativaVinculada: [],
	emefNovaVinculada: [],
	naoResolvidos: [],
	projetosComIdNuloIgnorados: []
};

// Mesma anomalia pré-existente já filtrada em migrar-escolas.js: alguns poucos
// documentos têm _id: null (dado quebrado, sem numInscricao/createdAt/integrantes -
// não é um projeto de verdade). Uma query {_id: proj._id} com proj._id === null
// bateria em QUALQUER outro documento igualmente quebrado, então esses precisam ser
// excluídos antes de qualquer update, não só ignorados no relatório.
function semIdNulo(proj) {
	if (proj._id === null || proj._id === undefined) {
		relatorio.projetosComIdNuloIgnorados.push({ nomeEscola: proj.nomeEscola, nomeProjeto: proj.nomeProjeto });
		return false;
	}
	return true;
}

async function renomearCidadeNova() {
	const escola = await Escola.findOne({ nome: 'Escola Municipal de Ensino Fundamental Cidade Nova' });
	if (!escola) return;
	const countProjetos = await Projeto.count({ $or: [{ escola: escola._id }, { nomeEscola: escola.nome }] });
	relatorio.renomeadas.push({ de: escola.nome, para: 'EMEF Cidade Nova', projetos: countProjetos });
	if (DRY_RUN) return;
	const nomeAntigo = escola.nome;
	escola.nome = 'EMEF Cidade Nova';
	await escola.save();
	await Projeto.update({ $or: [{ escola: escola._id }, { nomeEscola: nomeAntigo }] }, { $set: { nomeEscola: escola.nome } }, { multi: true });
}

async function resolverIfsulGenericoPorCidade() {
	const campus = await Escola.find({ nome: { $regex: /^(IFSul|IFRS) – Câmpus /i } });
	const escolaPorCidade = {};
	campus.forEach((e) => { if (e.cidade && !escolaPorCidade[e.cidade]) escolaPorCidade[e.cidade] = e; });

	let escolaGenericaCanonica = await Escola.findOne({ nome: NOME_GENERICO_CANONICO });

	const candidatos = (await Projeto.find({
		$and: [
			{ $or: [{ escola: { $exists: false } }, { escola: null }] },
			{ nomeEscola: { $regex: REGEX_IFSUL_GENERICO } }
		]
	}, 'numInscricao nomeProjeto nomeEscola cidade createdAt')).filter(semIdNulo);

	for (const proj of candidatos) {
		const alvo = proj.cidade && escolaPorCidade[proj.cidade];
		if (alvo) {
			relatorio.ifsulResolvidoPorCidade.push({ numInscricao: proj.numInscricao, ano: new Date(proj.createdAt).getFullYear(), cidade: proj.cidade, nomeEscolaOriginal: proj.nomeEscola, para: alvo.nome });
			if (!DRY_RUN) await Projeto.update({ _id: proj._id }, { $set: { escola: alvo._id, nomeEscola: alvo.nome } });
		} else {
			relatorio.ifsulSemCidadeCorrespondente.push({ numInscricao: proj.numInscricao, ano: new Date(proj.createdAt).getFullYear(), cidade: proj.cidade, nomeEscolaOriginal: proj.nomeEscola });
			if (!DRY_RUN) {
				if (!escolaGenericaCanonica) {
					escolaGenericaCanonica = new Escola({ nome: NOME_GENERICO_CANONICO, status: 'aprovada', origem: 'migracao' });
					await escolaGenericaCanonica.save();
				}
				await Projeto.update({ _id: proj._id }, { $set: { escola: escolaGenericaCanonica._id, nomeEscola: NOME_GENERICO_CANONICO } });
			}
		}
	}
}

async function vincularCooperativa() {
	const alvo = await Escola.findOne({ nome: 'EEEM Sebastião Jubal Junqueira' });
	if (!alvo) return;
	const projetos = (await Projeto.find({
		$and: [
			{ $or: [{ escola: { $exists: false } }, { escola: null }] },
			{ nomeEscola: { $regex: /COOPERATIVA ESCOLAR MAR DE SONHOS/i } }
		]
	}, 'numInscricao nomeEscola createdAt')).filter(semIdNulo);
	for (const proj of projetos) {
		relatorio.cooperativaVinculada.push({ numInscricao: proj.numInscricao, ano: new Date(proj.createdAt).getFullYear(), nomeEscolaOriginal: proj.nomeEscola });
		if (!DRY_RUN) await Projeto.update({ _id: proj._id }, { $set: { escola: alvo._id, nomeEscola: alvo.nome } });
	}
}

async function vincularEmefMariaAlmerinda() {
	const NOME = 'EMEF Maria Almerinda Paz de Oliveira';
	const projetos = (await Projeto.find({
		$and: [
			{ $or: [{ escola: { $exists: false } }, { escola: null }] },
			{ nomeEscola: { $regex: /Maria Almerinda Paz de Oliveira/i } }
		]
	}, 'numInscricao nomeEscola cidade estado createdAt')).filter(semIdNulo);
	if (projetos.length === 0) return;

	let escola = await Escola.findOne({ nome: NOME });
	for (const proj of projetos) {
		relatorio.emefNovaVinculada.push({ numInscricao: proj.numInscricao, ano: new Date(proj.createdAt).getFullYear(), nomeEscolaOriginal: proj.nomeEscola, cidade: proj.cidade });
		if (!DRY_RUN) {
			if (!escola) {
				escola = new Escola({ nome: NOME, cidade: proj.cidade, estado: proj.estado, status: 'aprovada', origem: 'migracao' });
				await escola.save();
			}
			await Projeto.update({ _id: proj._id }, { $set: { escola: escola._id, nomeEscola: escola.nome } });
		}
	}
}

async function registrarNaoResolvidos() {
	// Caso conhecido e ambíguo demais pra resolver sozinho - só registra no relatório.
	const projetos = await Projeto.find({
		$and: [
			{ $or: [{ escola: { $exists: false } }, { escola: null }] },
			{ nomeEscola: 'Escola Municipal de Ensino Fundamental' }
		]
	}, 'numInscricao nomeEscola cidade createdAt');
	projetos.forEach((proj) => {
		relatorio.naoResolvidos.push({ numInscricao: proj.numInscricao, ano: new Date(proj.createdAt).getFullYear(), cidade: proj.cidade, nomeEscolaOriginal: proj.nomeEscola, motivo: 'nome incompleto - qual EMEF?' });
	});
}

async function main() {
	await renomearCidadeNova();
	await resolverIfsulGenericoPorCidade();
	await vincularCooperativa();
	await vincularEmefMariaAlmerinda();
	await registrarNaoResolvidos();

	const nomeArquivo = 'scripts/relatorio-correcao-escolas-padronizacao2' + (DRY_RUN ? '-dry-run' : '') + '.json';
	fs.writeFileSync(path.join(__dirname, '..', nomeArquivo), JSON.stringify(relatorio, null, 2));

	console.log((DRY_RUN ? '[DRY RUN] ' : '') + 'Cidade Nova renomeada: ' + relatorio.renomeadas.length);
	console.log((DRY_RUN ? '[DRY RUN] ' : '') + 'IFSul genérico resolvido por cidade: ' + relatorio.ifsulResolvidoPorCidade.length);
	console.log((DRY_RUN ? '[DRY RUN] ' : '') + 'IFSul genérico sem cidade correspondente (foi pro bucket único): ' + relatorio.ifsulSemCidadeCorrespondente.length);
	console.log((DRY_RUN ? '[DRY RUN] ' : '') + 'Cooperativa vinculada: ' + relatorio.cooperativaVinculada.length);
	console.log((DRY_RUN ? '[DRY RUN] ' : '') + 'EMEF Maria Almerinda vinculada: ' + relatorio.emefNovaVinculada.length);
	console.log((DRY_RUN ? '[DRY RUN] ' : '') + 'Não resolvidos (revisão manual): ' + relatorio.naoResolvidos.length);
	console.log((DRY_RUN ? '[DRY RUN] ' : '') + 'Ignorados por _id nulo (anomalia pré-existente): ' + relatorio.projetosComIdNuloIgnorados.length);
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
