'use strict';

const mongoose = require('mongoose')
,	Schema = mongoose.Schema;

// Feira externa (ex: Mostratec, Mostratec Júnior, MOCITEC) para a qual um projeto pode ser
// classificado. Cadastrada por ano/mostra, com as categorias às quais se aplica e o texto
// do certificado de classificação - ver models/projeto-schema.js (feirasClassificadas).
//
// Também serve, com tipo:'edicao', pra representar a própria edição anual da MOVACI/PDIAP
// (categoriasEixos/diasAvaliacao) - não existia nenhuma outra coleção com histórico por ano
// pra isso, então reaproveita esta em vez de criar uma nova (decisão de produto, não só
// técnica). categorias/textoCertificado só fazem sentido pra tipo:'classificacao'.
const FeiraSchema = new Schema({
	nome: {type: String},
	categorias: [{type: String}],
	textoCertificado: {type: String},
	ano: {type: Number},
	createdAt: {type: Date},
	tipo: {type: String, enum: ['classificacao', 'edicao'], default: 'classificacao'},
	categoriasEixos: [{
		categoria: {type: String},
		eixos: [{type: String}]
	}],
	diasAvaliacao: [{
		data: {type: String},
		turnos: [{type: String}]
	}],
	// Quantos projetos por eixo (dentro de cada categoria) contam como "Premiado" ao usar
	// Ranking > Confirmar premiados - só faz sentido em tipo:'edicao'. Sem valor gravado
	// (edições antigas, ou a edição do ano ainda nem foi criada), assume-se 3 - ver
	// GET /admin/configPremiacao.
	numPremiadosPorEixo: {type: Number},
	// Quantos avaliadores lançam nota por projeto (2 hoje; ex: 2027 pode usar 3) - só faz
	// sentido em tipo:'edicao'. Sem valor gravado (edições antigas, ou a edição ainda nem
	// foi criada), assume-se 2 - ver adminAPI.getFeiras()/getFeirasInfo e os fallbacks em
	// avaliacaoInserirCtrl.js/avaliacaoCtrl.js.
	numAvaliadoresPorProjeto: {type: Number},
	// Link de inscrição próprio da edição (ex: "xi-movaci" -> /projetos/inscricao/xi-movaci)
	// - só faz sentido em tipo:'edicao'. Único entre edições (checado em routes/admin.js
	// POST /criarFeira e PUT /editarFeira), permite que duas Mostras no mesmo ano tenham
	// links de inscrição separados - ver memória project-mostra-ano-nao-unico (Fase 2).
	slug: {type: String},
	// Prazo de inscrição PRÓPRIO desta edição (mesma forma de models/admin-schema.js
	// prazoProjetos/prazoAvaliadores, computado por utils/prazo.js#computaPrazo) - permite
	// que duas edições em paralelo tenham calendários de inscrição independentes. Só faz
	// sentido em tipo:'edicao'.
	prazoProjetos: {
		ativo: { type: Boolean, default: true },
		dataPrazo: { type: Date },
		textoPrazo: { type: String },
		dataProrrogacao: { type: Date },
		textoProrrogacao: { type: String },
		textoEncerrado: { type: String }
	},
	prazoAvaliadores: {
		ativo: { type: Boolean, default: true },
		dataPrazo: { type: Date },
		textoPrazo: { type: String },
		dataProrrogacao: { type: Date },
		textoProrrogacao: { type: String },
		textoEncerrado: { type: String }
	},
	// "Campos editáveis" desta Mostra (só tipo:'edicao') - o que os integrantes podem alterar no
	// projeto pelo painel, mais o texto/link da tela do projeto. Sem valor gravado = nunca
	// configurada (ver controllers/opcoes-projetos-controller.js, que decide o que vale nesse caso);
	// por isso nenhum campo aqui tem default.
	// Avaliação PRÉVIA dos trabalhos (aprovação pra apresentação/anais) desta Mostra - ver
	// controllers/avaliacao-previa-controller.js. Os projetos enviam o texto (PDF) pelo painel até
	// envioPrazo; avaliadores(as) aptos(as) recebem os trabalhos (P2) e avaliam pela ficha da categoria.
	avaliacaoPrevia: new Schema({
		ativa: {type: Boolean},
		envioInicio: {type: Date},
		envioPrazo: {type: Date},
		instrucoesEnvio: {type: String},
		modo: {type: String, enum: ['convite', 'direto']},
		diasParaAceitar: {type: Number},
		prazoAvaliacao: {type: Date},
		avaliadoresPorTrabalho: {type: Number},
		anonima: {type: Boolean},
		contaNaFinal: {type: Boolean},
		instrucoesAvaliador: {type: String},
		fichas: [{
			categoria: {type: String},
			criterios: [{ nome: {type: String}, maximo: {type: Number}, _id: false }],
			_id: false
		}]
	}, { _id: false }),
	// Administradores(as) DESTA Mostra (só tipo:'edicao'): Pessoas com o acesso do admin2
	// restrito a esta edição (ver utils/perfil.js). Atribuídos pelo(a) super-admin.
	administradores: [{type: Schema.Types.ObjectId, ref: 'Pessoa'}],
	opcoesProjetos: new Schema({
		nomeProjeto: {type: Boolean}, palavras_chave: {type: Boolean}, resumo: {type: Boolean},
		categoria: {type: Boolean}, eixo: {type: Boolean}, participa: {type: Boolean},
		instituicao: {type: Boolean}, integrantes: {type: Boolean}, hospedagem: {type: Boolean}, upload: {type: Boolean},
		link: {type: Boolean}, linkValor: {type: String},
		textoInicial: {type: Boolean}, textoInicialValor: {type: String}
	}, { _id: false })
}, { collection: 'feiras' });

const Feira = module.exports = mongoose.model('Feira', FeiraSchema);
