'use strict';

// Admin > Inconsistências > Cadastro: problemas de cadastro que impedem alguém de entrar, de ser
// achado(a) pelo documento (certificados) ou de ser ligado(a) ao cadastro único. Os da própria
// Pessoa (nome incompleto, documento, nacionalidade) ela mesma corrige ao entrar
// (utils/pendencias.js); os outros (e-mail repetido, integrante sem cadastro...) são da organização.
//
// Por Mostra: integrantes dos projetos e avaliadores(as) da Mostra escolhida. Cadastro único
// inteiro (e-mails repetidos etc.): só pra super-admin, porque não pertence a uma Mostra.

const Pessoa = require('../models/pessoa-schema')
,	Projeto = require('../models/projeto-schema')
,	Avaliador = require('../models/avaliador-schema')
,	Feira = require('../models/feira-schema')
,	documentoValidator = require('../utils/documentoValidator')
,	pendencias = require('../utils/pendencias');

const docValido = (d) => documentoValidator.validarDocumentoQualquerPais(d || '').valido;
const chaveEmail = (e) => (e || '').trim().toLowerCase();

// Registros da Mostra: feiraId dela ou, em registro antigo sem feiraId, o ano dela quando ela é a
// única edição do ano (mesma regra de utils/perfil.js#escopo).
async function filtroDaMostra(mostra) {
	let condicoes = [{ feiraId: mostra._id }];
	if (mostra.ano && (await Feira.countDocuments({ tipo: 'edicao', ano: mostra.ano })) === 1) {
		condicoes.push({ feiraId: null, createdAt: { $gte: new Date(mostra.ano, 0, 1), $lt: new Date(mostra.ano + 1, 0, 1) } });
	}
	return { $or: condicoes };
}

// Índices do cadastro único pra explicar por que alguém não está ligado(a) a ele.
async function indicesPessoas() {
	let pessoas = await Pessoa.find({}, 'nome email emailsAlternativos documento nacionalidade').lean();
	let porEmail = new Map(), porDoc = new Map(), porId = new Map();
	pessoas.forEach((p) => {
		porId.set(String(p._id), p);
		if (p.documento) porDoc.set(String(p.documento).toUpperCase(), p);
		[p.email].concat(p.emailsAlternativos || []).forEach((e) => {
			let k = chaveEmail(e);
			if (!k) return;
			if (!porEmail.has(k)) porEmail.set(k, []);
			porEmail.get(k).push(p);
		});
	});
	return { pessoas, porEmail, porDoc, porId };
}

// Por que este integrante/avaliador(a) não entra (ou entra no cadastro de outra pessoa)?
function problemasDoRegistro(r, idx) {
	let problemas = [];
	let doc = (r.cpf || '').toString();
	if (!docValido(doc)) problemas.push('Documento inválido ou ausente' + (doc ? ' ("' + doc + '")' : '') + ' - certificado não sai e não liga ao cadastro.');
	let ligada = r.pessoa && idx.porId.get(String(r.pessoa));
	if (!ligada) {
		let donosEmail = idx.porEmail.get(chaveEmail(r.email)) || [];
		let donoDoc = docValido(doc) ? idx.porDoc.get(doc.toUpperCase()) : null;
		if (!r.email) problemas.push('Sem e-mail - não consegue entrar.');
		else if (donosEmail.length && !donosEmail.some((p) => p.documento && p.documento.toUpperCase() === doc.toUpperCase())) {
			problemas.push('Usa o e-mail ' + r.email + ', que já é de ' + donosEmail.map((p) => p.nome).join(', ') + ' - não entra com conta própria.');
		} else if (donoDoc && !donosEmail.length) {
			problemas.push('O documento é de ' + donoDoc.nome + ', mas o e-mail é outro (' + r.email + ') - não liga ao cadastro.');
		} else if (docValido(doc)) {
			problemas.push('Sem cadastro único (nenhuma pessoa com esse documento e e-mail).');
		}
	}
	return problemas;
}

module.exports.listar = async (mostra, superAdmin) => {
	let idx = await indicesPessoas();
	let filtro = await filtroDaMostra(mostra);

	let integrantes = [], integrantesSemNacionalidade = 0;
	let projetos = await Projeto.find(filtro, 'numInscricao nomeProjeto integrantes').sort({ numInscricao: 1 }).lean();
	projetos.forEach((p) => (p.integrantes || []).forEach((i) => {
		if (!i.nacionalidade) integrantesSemNacionalidade++;
		let problemas = problemasDoRegistro(i, idx);
		if (problemas.length) {
			integrantes.push({ projetoId: p._id, numInscricao: p.numInscricao, nomeProjeto: p.nomeProjeto, tipo: i.tipo === 'Orientador' ? 'Orientador(a)' : 'Estudante',
				nome: i.nome, documento: i.cpf, email: i.email, problemas: problemas });
		}
	}));

	let avaliadores = [];
	(await Avaliador.find(filtro, 'nome email cpf pessoa').lean()).forEach((a) => {
		let problemas = problemasDoRegistro(a, idx);
		if (problemas.length) avaliadores.push({ nome: a.nome, documento: a.cpf, email: a.email, problemas: problemas });
	});

	let resposta = { mostra: { nome: mostra.nome, ano: mostra.ano }, integrantes, integrantesSemNacionalidade, avaliadores };
	if (!superAdmin) return resposta;

	// Cadastro único inteiro (só super-admin).
	let emailsRepetidos = [];
	idx.porEmail.forEach((lista, email) => {
		let distintas = [...new Map(lista.map((p) => [String(p._id), p])).values()];
		if (distintas.length > 1) emailsRepetidos.push({ email: email, pessoas: distintas.map((p) => ({ nome: p.nome, documento: p.documento })) });
	});
	let pessoasComPendencia = [], semNacionalidade = 0, semEmail = [];
	idx.pessoas.forEach((p) => {
		if (!p.email) semEmail.push({ nome: p.nome, documento: p.documento });
		let lista = pendencias.daPessoa(p);
		if (lista.some((x) => x.campo === 'nacionalidade')) semNacionalidade++;
		let graves = lista.filter((x) => x.campo !== 'nacionalidade');
		if (graves.length) pessoasComPendencia.push({ nome: p.nome, email: p.email, documento: p.documento, problemas: graves.map((x) => x.campo === 'nome' ? 'Nome incompleto' : (p.documento ? 'Documento inválido' : 'Sem documento')) });
	});
	resposta.cadastroUnico = { emailsRepetidos, pessoasComPendencia, semEmail, semNacionalidade, total: idx.pessoas.length };
	return resposta;
};
