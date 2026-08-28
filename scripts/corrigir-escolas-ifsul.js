'use strict';

// Correções pontuais na migração de escolas (scripts/migrar-escolas.js), feitas depois
// que ela já tinha rodado em produção - não é uma re-migração completa, só ajusta o que
// o usuário reportou errado depois de ver os dados reais:
//
// 1. Renomeia duas escolas que ficaram com nome errado/abreviado demais:
//    "IFSul – Câmpus CAVG (Pelotas)" -> "IFSul – Câmpus Pelotas-Visconde da Graça (CaVG)"
//    "IFRS – Campus Canoas" -> "IFRS – Câmpus Canoas" (faltava o acento em "Câmpus")
//
// 2. Três nomes que são "IFSul genérico" (sem câmpus especificado) e não deveriam
//    existir como escola própria - cada projeto vinculado a eles é resolvido
//    individualmente pela SUA PRÓPRIA cidade contra os câmpus já cadastrados, mesma
//    lógica de scripts/migrar-escolas.js (função resolverPorCidadeDoProjeto), mais um
//    mapeamento extra pra cidades vizinhas sem câmpus próprio que o usuário confirmou
//    explicitamente (Santa Cruz do Sul -> Câmpus Venâncio Aires). O que sobrar sem
//    cidade correspondente cai no bucket genérico único "IFSul – Não Especificado
//    (Geral / Reitoria)"; os outros dois nomes genéricos são apagados no final, se
//    ficarem com 0 projetos.
//
// Idempotente: rodar de novo não faz nada (os nomes já corrigidos não batem mais com
// RENOMEAR, e os genéricos sem projeto vinculado já não existem mais).
//
// Uso:
//   node scripts/corrigir-escolas-ifsul.js --dry-run   (só imprime o que faria)
//   node scripts/corrigir-escolas-ifsul.js             (roda de verdade)

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('../configs/db-config');
const Projeto = require('../models/projeto-schema');
const Escola = require('../models/escola-schema');

const DRY_RUN = process.argv.includes('--dry-run');

const RENOMEAR = [
	{ de: 'IFSul – Câmpus CAVG (Pelotas)', para: 'IFSul – Câmpus Pelotas-Visconde da Graça (CaVG)' },
	{ de: 'IFRS – Campus Canoas', para: 'IFRS – Câmpus Canoas' }
];

const NOMES_GENERICOS = [
	'Instituto Federal de Educação, Ciência e Tecnologia',
	'IFSUL – Projeto Partiu IF',
	'IFSul – Não Especificado (Geral / Reitoria)'
];
const NOME_GENERICO_CANONICO = 'IFSul – Não Especificado (Geral / Reitoria)';

// Cidades vizinhas sem câmpus IFSul/IFRS próprio, mapeadas pro câmpus mais próximo -
// só os casos que o usuário confirmou explicitamente, nada de inferência geográfica.
const CIDADE_SEM_CAMPUS = {
	'Santa Cruz do Sul': 'IFSul – Câmpus Venâncio Aires'
};

const relatorio = {
	renomeadas: [],
	projetosResolvidosPorCidade: [],
	projetosMovidosParaGenericoUnico: [],
	escolasGenericasRemovidas: []
};

async function renomear() {
	for (const { de, para } of RENOMEAR) {
		const escola = await Escola.findOne({ nome: de });
		if (!escola) continue;
		const countProjetos = await Projeto.count({ $or: [{ escola: escola._id }, { nomeEscola: de }] });
		relatorio.renomeadas.push({ de: de, para: para, projetos: countProjetos });
		if (DRY_RUN) continue;
		escola.nome = para;
		await escola.save();
		await Projeto.update({ $or: [{ escola: escola._id }, { nomeEscola: de }] }, { $set: { nomeEscola: para } }, { multi: true });
	}
}

async function resolverGenericos() {
	// Mapa cidade -> escola de câmpus específico, montado DEPOIS do rename acima (pra já
	// enxergar os nomes corrigidos).
	const campus = await Escola.find({ nome: { $regex: /^(IFSul|IFRS) – Câmpus /i } });
	const escolaPorCidade = {};
	const escolaPorNome = {};
	campus.forEach((e) => {
		escolaPorNome[e.nome] = e;
		if (e.cidade && !escolaPorCidade[e.cidade]) escolaPorCidade[e.cidade] = e;
	});

	function resolverParaProjeto(proj) {
		if (proj.cidade && escolaPorCidade[proj.cidade]) return escolaPorCidade[proj.cidade];
		if (proj.cidade && CIDADE_SEM_CAMPUS[proj.cidade] && escolaPorNome[CIDADE_SEM_CAMPUS[proj.cidade]]) {
			return escolaPorNome[CIDADE_SEM_CAMPUS[proj.cidade]];
		}
		return null;
	}

	let escolaGenericaCanonica = await Escola.findOne({ nome: NOME_GENERICO_CANONICO });

	for (const nomeGenerico of NOMES_GENERICOS) {
		const escolaGenerica = await Escola.findOne({ nome: nomeGenerico });
		if (!escolaGenerica) continue;

		const projetos = await Projeto.find({ $or: [{ escola: escolaGenerica._id }, { nomeEscola: nomeGenerico }] }, 'numInscricao nomeProjeto cidade escola');
		for (const proj of projetos) {
			const alvo = resolverParaProjeto(proj);
			if (alvo) {
				relatorio.projetosResolvidosPorCidade.push({ numInscricao: proj.numInscricao, cidade: proj.cidade, de: nomeGenerico, para: alvo.nome });
				if (!DRY_RUN) await Projeto.update({ _id: proj._id }, { $set: { escola: alvo._id, nomeEscola: alvo.nome } });
			} else {
				// Sem câmpus correspondente pra cidade dele - fica no bucket genérico único.
				if (nomeGenerico !== NOME_GENERICO_CANONICO) {
					relatorio.projetosMovidosParaGenericoUnico.push({ numInscricao: proj.numInscricao, cidade: proj.cidade, de: nomeGenerico });
					if (!DRY_RUN) {
						if (!escolaGenericaCanonica) {
							escolaGenericaCanonica = new Escola({ nome: NOME_GENERICO_CANONICO, status: 'aprovada', origem: 'migracao' });
							await escolaGenericaCanonica.save();
						}
						await Projeto.update({ _id: proj._id }, { $set: { escola: escolaGenericaCanonica._id, nomeEscola: NOME_GENERICO_CANONICO } });
					}
				}
				// já está no genérico canônico - não precisa fazer nada.
			}
		}

		// Depois de mover todo mundo, o nome genérico não-canônico não deve mais existir
		// como escola selecionável (não é uma escola de verdade).
		if (nomeGenerico !== NOME_GENERICO_CANONICO) {
			const restantes = await Projeto.count({ $or: [{ escola: escolaGenerica._id }, { nomeEscola: nomeGenerico }] });
			relatorio.escolasGenericasRemovidas.push({ nome: nomeGenerico, projetosRestantes: restantes });
			if (!DRY_RUN && restantes === 0) await Escola.remove({ _id: escolaGenerica._id });
		}
	}
}

async function main() {
	await renomear();
	await resolverGenericos();

	const nomeArquivo = 'scripts/relatorio-correcao-escolas-ifsul' + (DRY_RUN ? '-dry-run' : '') + '.json';
	fs.writeFileSync(path.join(__dirname, '..', nomeArquivo), JSON.stringify(relatorio, null, 2));

	console.log((DRY_RUN ? '[DRY RUN] ' : '') + 'Renomeadas: ' + relatorio.renomeadas.length);
	console.log((DRY_RUN ? '[DRY RUN] ' : '') + 'Projetos resolvidos por cidade: ' + relatorio.projetosResolvidosPorCidade.length);
	console.log((DRY_RUN ? '[DRY RUN] ' : '') + 'Projetos movidos pro genérico único: ' + relatorio.projetosMovidosParaGenericoUnico.length);
	console.log((DRY_RUN ? '[DRY RUN] ' : '') + 'Escolas genéricas (não-canônicas) removidas: ' + relatorio.escolasGenericasRemovidas.filter((e) => e.projetosRestantes === 0).length);
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
