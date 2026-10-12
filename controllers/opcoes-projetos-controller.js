'use strict';

// "Campos editáveis" POR MOSTRA (Editar > Campos editáveis, no admin): o que os integrantes podem
// alterar no projeto pelo painel (routes/painel-projetos.js) e o texto/link mostrados na tela do
// projeto. Antes era uma configuração só, global (admin2.opcoes), que valia pra qualquer edição.
//
// Cada Mostra (Feira tipo:'edicao') guarda as suas em `opcoesProjetos`. Mostra que nunca foi
// configurada: a Mostra ATUAL herda a configuração global antiga (admin2.opcoes), pra nada mudar
// até a organização salvar pela tela nova; qualquer outra Mostra fica com tudo desligado (projeto
// de edição passada não muda mais - o papel que a regra "ano do projeto x ano da edição" fazia).

const Admin = require('../models/admin-schema')
,	Feira = require('../models/feira-schema')
,	adminController = require('./admin-controller');

// Liga/desliga a alteração de cada parte do projeto pelos integrantes.
const FLAGS = ['nomeProjeto', 'palavras_chave', 'resumo', 'categoria', 'eixo', 'participa', 'instituicao', 'integrantes', 'hospedagem', 'upload'];
// Exibição na tela do projeto (não são permissões).
const EXIBICAO = ['link', 'textoInicial'];
const TEXTOS = ['linkValor', 'textoInicialValor'];
module.exports.FLAGS = FLAGS;

function idValido(id) {
	return typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
}

// Só os campos conhecidos, com o tipo certo (o body do admin nunca vai cru pro banco).
function limpar(opcoes) {
	let o = {};
	FLAGS.concat(EXIBICAO).forEach((k) => { o[k] = opcoes && opcoes[k] === true; });
	TEXTOS.forEach((k) => { o[k] = opcoes && opcoes[k] != null ? String(opcoes[k]).slice(0, 5000) : ''; });
	return o;
}
module.exports.limpar = limpar;

function configurada(o) {
	return !!(o && FLAGS.concat(EXIBICAO).some((k) => typeof o[k] === 'boolean'));
}

// Mostra atual (Editar > Mostra atual) ou, sem ela, a edição de maior ano - mesma regra do admin.
async function mostraAtual() {
	let id = await adminController.getMostraAtualId();
	if (id) return Feira.findById(id).lean();
	return Feira.findOne({ tipo: 'edicao' }).sort({ ano: -1, _id: -1 }).lean();
}
module.exports.mostraAtual = mostraAtual;

// Mostra do projeto: a gravada (feiraId) ou, em registro antigo sem ela, a única edição do ano
// de createdAt (mesma regra de perfis-controller/migrar-feiraId; dois no mesmo ano = nenhuma).
module.exports.mostraDoProjeto = async (projeto) => {
	if (projeto.feiraId) return Feira.findOne({ _id: projeto.feiraId, tipo: 'edicao' }).lean();
	if (!projeto.createdAt) return null;
	let doAno = await Feira.find({ tipo: 'edicao', ano: new Date(projeto.createdAt).getFullYear() }).lean();
	return doAno.length === 1 ? doAno[0] : null;
};

// Opções de uma Mostra (objeto lean da Feira), já limpas.
module.exports.opcoesDaMostra = async (mostra) => {
	if (!mostra) return limpar({});
	if (configurada(mostra.opcoesProjetos)) return limpar(mostra.opcoesProjetos);
	let atual = await mostraAtual();
	if (atual && String(atual._id) === String(mostra._id)) {
		let admin = await Admin.findOne({ username: 'admin2' }, 'opcoes').lean();
		return limpar(admin && admin.opcoes);
	}
	return limpar({});
};

module.exports.opcoesDoProjeto = async (projeto) => {
	let mostra = await module.exports.mostraDoProjeto(projeto);
	return { mostra: mostra, opcoes: await module.exports.opcoesDaMostra(mostra) };
};

// Por id de Mostra vindo do admin (ou a atual, sem id). Devolve null se o id não é de uma edição.
module.exports.mostraPorId = async (mostraId) => {
	if (!mostraId) return mostraAtual();
	if (!idValido(mostraId)) return null;
	return Feira.findOne({ _id: mostraId, tipo: 'edicao' }).lean();
};

module.exports.salvar = async (mostraId, opcoes) => {
	let r = await Feira.updateOne({ _id: mostraId, tipo: 'edicao' }, { $set: { opcoesProjetos: limpar(opcoes) } });
	return r.matchedCount > 0;
};
