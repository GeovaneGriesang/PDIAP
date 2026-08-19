'use strict';

const mongoose = require('mongoose')
,	Schema = mongoose.Schema;

const opcoesSchema = new Schema({	
	instituicao: {type: Boolean},
	integrantes: {type: Boolean},
	hospedagem: {type: Boolean},
	upload: {type: Boolean},
	nomeProjeto: {type: Boolean},
	palavras_chave: {type: Boolean},
	categoria: {type: Boolean},
	eixo: {type: Boolean},
	participa: {type: Boolean},
	resumo: {type: Boolean}
});

const AdminSchema = new Schema({
	username: {
		type: String
	},
	password: {
		type: String
	},
	permissao: {
		type: String
	},
	dias: {
		type: String
	},
	mes: {
		type: String
	},
	ano: {
		type: String
	},
	edicao: {
		type: String	
	},
	text: {
		type: String
	},
	cadastro_projetos: {
		type: Boolean
	},
	cadastro_avaliadores: {
		type: Boolean
	},
	saberes_docentes: {
		type: Boolean
	},
	// Prazo de inscrição com 2 estágios (prazo -> prorrogação opcional -> encerrado),
	// calculado no servidor em controllers/admin-controller.js#getEdicaoAtual.
	// 'ativo' é a chave geral: false força "encerrado" independente das datas.
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
	// Botões configuráveis da home/menu (ex.: "Agendar Visita"), texto + link.
	botoes: [{
		texto: { type: String },
		link: { type: String }
	}],
	// Mensagens de destaque exibidas na home (ex.: classificações para a Mostratec).
	destaques: [{
		texto: { type: String }
	}],
	opcoes: opcoesSchema
}, { collection: 'adminCollection' });

const Avaliador = module.exports = mongoose.model('Admin', AdminSchema);
