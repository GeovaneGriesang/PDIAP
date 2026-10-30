'use strict';

// Perfis de uma pessoa por Mostra (tela admin "Pessoas"). O perfil NUNCA é gravado na
// Pessoa: é derivado, a cada consulta, dos vínculos que ela tem em cada Mostra - a mesma
// pessoa pode ser estudante numa Mostra, orientadora e avaliadora na seguinte, responsável
// por seminário e participante de oficina em outra.
//
// Um registro é da pessoa se tem `pessoa` apontando pra ela OU o mesmo documento (registros
// antigos sem vínculo, ver scripts/vincular-integrantes-responsaveis.js). Documento casa sem
// diferenciar maiúscula/minúscula (documento estrangeiro pode ter letras).

const Pessoa = require('../models/pessoa-schema')
,	Avaliador = require('../models/avaliador-schema')
,	Participante = require('../models/participante-schema')
,	Projeto = require('../models/projeto-schema')
,	Evento = require('../models/evento-schema')
,	Saberes = require('../models/saberes-schema')
,	Feira = require('../models/feira-schema')
,	documentoValidator = require('../utils/documentoValidator');

function escaparRegex(texto) {
	return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Busca no cadastro único por nome (parte, sem diferenciar maiúscula), documento (início)
// ou e-mail (parte; principal ou alternativo). Até 30 resultados.
module.exports.pesquisar = async (termo) => {
	let q = (termo || '').toString().trim();
	if (q.length < 3) return [];
	let condicoes = [
		{ nome: new RegExp(escaparRegex(q), 'i') },
		{ email: new RegExp(escaparRegex(q), 'i') },
		{ emailsAlternativos: new RegExp(escaparRegex(q), 'i') }
	];
	let doc = documentoValidator.normalizarDocumento(q);
	if (doc.length >= 3) condicoes.push({ documento: new RegExp('^' + doc, 'i') });
	return Pessoa.find({ $or: condicoes }, 'documento nome email emailsAlternativos nacionalidade').sort({ nome: 1 }).limit(30).lean();
};

module.exports.perfis = async (documentoInformado) => {
	let documento = documentoValidator.normalizarDocumento(documentoInformado);
	if (!documento) return null;

	let pessoa = await Pessoa.findOne({ documento: documento }, 'documento nome email emailsAlternativos telefone nacionalidade createdAt').lean();
	// Só letras/números no padrão (normalizado), então não há o que escapar.
	let docRegex = new RegExp('^' + documento + '$', 'i');
	let porDocOuPessoa = pessoa ? { $or: [{ cpf: docRegex }, { pessoa: pessoa._id }] } : { cpf: docRegex };

	let [feiras, avaliadores, participantes, projetos, eventos, saberes] = await Promise.all([
		Feira.find({ tipo: 'edicao' }, 'nome ano').lean(),
		Avaliador.find(porDocOuPessoa, 'nome feiraId createdAt avaliacao').lean(),
		Participante.find(porDocOuPessoa, 'nome feiraId createdAt eventos').lean(),
		Projeto.find({ integrantes: { $elemMatch: porDocOuPessoa } }, 'nomeProjeto numInscricao aprovado feiraId createdAt integrantes').lean(),
		Evento.find({ responsavel: { $elemMatch: porDocOuPessoa } }, 'tipo titulo data feiraId createdAt').lean(),
		Saberes.find(porDocOuPessoa, 'tipo createdAt').lean()
	]);

	// Agrupa por Mostra: feiraId quando existe; registro antigo sem feiraId cai no ano de
	// createdAt (mesma regra de adminAPI.pertenceAMostra no client) - se só existe uma Mostra
	// naquele ano, usa ela.
	let feiraPorId = new Map(feiras.map((f) => [String(f._id), f]));
	let grupos = new Map();
	function grupo(registro) {
		let chave, rotulo, ano;
		let feira = registro.feiraId && feiraPorId.get(String(registro.feiraId));
		if (!feira && registro.createdAt) {
			ano = new Date(registro.createdAt).getFullYear();
			let doAno = feiras.filter((f) => f.ano === ano);
			if (doAno.length === 1) feira = doAno[0];
		}
		if (feira) { chave = String(feira._id); rotulo = feira.ano + ' - ' + feira.nome; ano = feira.ano; }
		else { chave = 'ano-' + (ano || 'sem-data'); rotulo = ano ? String(ano) : 'Sem data'; }
		// mostraId: o "Meu painel" casa os certificados com a Mostra por ele (duas Mostras no mesmo ano).
		if (!grupos.has(chave)) grupos.set(chave, { mostra: rotulo, ano: ano || 0, mostraId: feira ? String(feira._id) : null, papeis: [] });
		return grupos.get(chave);
	}
	function dele(sub) {
		return (pessoa && sub.pessoa && String(sub.pessoa) === String(pessoa._id)) || docRegex.test(sub.cpf || '');
	}

	avaliadores.forEach((a) => grupo(a).papeis.push({ papel: 'Avaliador(a)', detalhe: a.avaliacao ? 'Presença confirmada' : 'Inscrito(a), presença ainda não confirmada' }));
	projetos.forEach((p) => {
		(p.integrantes || []).filter(dele).forEach((i) => {
			grupo(p).papeis.push({
				// projetoId: o "Meu painel" usa pra abrir o projeto (routes/painel-projetos.js).
				projetoId: p._id,
				papel: i.tipo === 'Orientador' ? 'Orientador(a)' : 'Estudante',
				detalhe: (p.numInscricao ? '#' + p.numInscricao + ' ' : '') + p.nomeProjeto + (p.aprovado === true ? ' (aprovado)' : p.aprovado === false ? ' (não aprovado)' : '')
			});
		});
	});
	eventos.forEach((e) => grupo(e).papeis.push({ papel: 'Responsável - ' + e.tipo, detalhe: e.titulo + (e.data ? ' (' + e.data + ')' : '') }));
	participantes.forEach((p) => {
		let evts = p.eventos || [];
		if (!evts.length) grupo(p).papeis.push({ papel: 'Participante', detalhe: 'Sem eventos vinculados' });
		evts.forEach((e) => grupo(p).papeis.push({ papel: 'Participante - ' + e.tipo, detalhe: e.titulo + (e.data ? ' (' + e.data + ')' : '') }));
	});
	saberes.forEach((s) => grupo(s).papeis.push({ papel: 'Saberes Docentes', detalhe: s.tipo || 'Inscrição' }));

	// Nome/e-mail de quem ainda não tem Pessoa: do registro mais recente que achar.
	let nomeRegistro = (avaliadores[0] || participantes[0] || {}).nome;
	if (!nomeRegistro) {
		for (let p of projetos) { let i = (p.integrantes || []).find(dele); if (i) { nomeRegistro = i.nome; break; } }
	}

	return {
		documento: documento,
		cadastrada: !!pessoa,
		pessoa: pessoa ? { _id: pessoa._id, nome: pessoa.nome, email: pessoa.email, emailsAlternativos: pessoa.emailsAlternativos || [], telefone: pessoa.telefone, nacionalidade: pessoa.nacionalidade } : { nome: nomeRegistro },
		mostras: [...grupos.values()].sort((a, b) => b.ano - a.ano)
	};
};

// --- Edição pela organização (tela "Pessoas", só super-admin) --------------------------------

const pessoaController = require('./pessoa-controller')
,	pendencias = require('../utils/pendencias');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Cadastro de uma pessoa nova pela organização (Cadastros gerais > Pessoas): nome completo, documento,
// nacionalidade e e-mail obrigatórios (certificado e login); telefone opcional. O primeiro acesso é
// pelo e-mail com o documento como senha (utils/loginBootstrap.js), como nas outras contas criadas
// pela organização. Devolve { erro } ou { pessoa }.
module.exports.criar = async (dados) => {
	dados = dados || {};
	let nome = String(dados.nome || '').trim().replace(/\s+/g, ' ');
	if (!pendencias.nomeCompleto(nome)) return { erro: 'Informe o nome completo (nome e sobrenome).' };
	let checagem = documentoValidator.validarDocumentoQualquerPais(String(dados.documento || ''));
	if (!checagem.valido) return { erro: checagem.mensagem };
	let existente = await Pessoa.findOne({ documento: checagem.normalizado }, 'nome').lean();
	if (existente) return { erro: 'Este documento já está cadastrado (' + (existente.nome || 'sem nome') + ').' };
	if (pendencias.NACIONALIDADES.indexOf(dados.nacionalidade) === -1) return { erro: 'Escolha a nacionalidade.' };
	let email = String(dados.email || '').trim().toLowerCase();
	if (!EMAIL_RE.test(email) || email.length > 200) return { erro: 'Informe um e-mail válido.' };
	// _id novo (e não null): assim conta também e-mail de avaliador(a)/participante antigo(a) sem cadastro.
	if (!(await pessoaController.emailLivre(email, new Pessoa()._id))) return { erro: 'O e-mail ' + email + ' já é usado por outro cadastro.' };
	let tel = String(dados.telefone || '').trim();
	if (tel) {
		let t = documentoValidator.validarTelefone(tel);
		if (!t.valido) return { erro: 'Telefone inválido (com DDD; de outro país, com o código do país).' };
		tel = t.normalizado;
	}
	let pessoa = await new Pessoa({ nome: nome, documento: checagem.normalizado, nacionalidade: dados.nacionalidade, email: email,
		telefone: tel || undefined, createdAt: new Date() }).save();
	return { pessoa: pessoa };
};

// Altera os dados da Pessoa `id` (só os campos enviados) e as cópias que os outros cadastros
// guardam (Avaliador, Participante, integrantes de projeto, responsável de evento, Saberes) - de
// registro ligado a ela OU com o documento ANTIGO dela (mesma regra de #perfis). Devolve { erro }
// ou { pessoa } já gravada.
module.exports.atualizarDados = async (id, dados) => {
	let pessoa = await Pessoa.findById(id);
	if (!pessoa) return { erro: 'Cadastro não encontrado.' };
	dados = dados || {};
	let novo = {};

	if (dados.nome !== undefined) {
		let nome = String(dados.nome || '').trim().replace(/\s+/g, ' ');
		if (!pendencias.nomeCompleto(nome)) return { erro: 'Informe o nome completo (nome e sobrenome).' };
		if (nome !== pessoa.nome) novo.nome = nome;
	}
	if (dados.documento !== undefined) {
		let checagem = documentoValidator.validarDocumentoQualquerPais(String(dados.documento || ''));
		if (!checagem.valido) return { erro: checagem.mensagem };
		if (checagem.normalizado !== pessoa.documento) {
			if (await Pessoa.exists({ documento: checagem.normalizado, _id: { $ne: pessoa._id } })) {
				return { erro: 'Este documento já é de outro cadastro. Se for a mesma pessoa, junte os cadastros (Inconsistências > Cadastro).' };
			}
			novo.documento = checagem.normalizado;
		}
	}
	if (dados.nacionalidade !== undefined) {
		if (pendencias.NACIONALIDADES.indexOf(dados.nacionalidade) === -1) return { erro: 'Escolha a nacionalidade.' };
		if (dados.nacionalidade !== pessoa.nacionalidade) novo.nacionalidade = dados.nacionalidade;
	}
	if (dados.telefone !== undefined) {
		let tel = String(dados.telefone || '').trim();
		if (tel) {
			let t = documentoValidator.validarTelefone(tel);
			if (!t.valido) return { erro: 'Telefone inválido (com DDD; de outro país, com o código do país).' };
			tel = t.normalizado;
		}
		if (tel !== (pessoa.telefone || '')) novo.telefone = tel;
	}
	// E-mails: principal + alternativos, até pessoaController.MAX_EMAILS no total, todos livres.
	if (dados.email !== undefined || dados.emailsAlternativos !== undefined) {
		let principal = dados.email !== undefined ? String(dados.email || '').trim().toLowerCase() : pessoa.email;
		let alternativos = dados.emailsAlternativos !== undefined
			? (Array.isArray(dados.emailsAlternativos) ? dados.emailsAlternativos : []).map((e) => String(e || '').trim().toLowerCase()).filter(Boolean)
			: (pessoa.emailsAlternativos || []);
		if (!principal || !EMAIL_RE.test(principal)) return { erro: 'Informe um e-mail principal válido.' };
		alternativos = alternativos.filter((e, i) => !pessoaController.mesmoEmail(e, principal) && alternativos.findIndex((x) => pessoaController.mesmoEmail(x, e)) === i);
		if (alternativos.length + 1 > pessoaController.MAX_EMAILS) return { erro: 'No máximo ' + pessoaController.MAX_EMAILS + ' e-mails por cadastro.' };
		for (let e of [principal].concat(alternativos)) {
			if (!EMAIL_RE.test(e) || e.length > 200) return { erro: 'E-mail inválido: ' + e };
			if (!(await pessoaController.emailLivre(e, pessoa._id))) return { erro: 'O e-mail ' + e + ' já é usado por outro cadastro.' };
		}
		if (!pessoaController.mesmoEmail(principal, pessoa.email)) novo.email = principal;
		let antes = (pessoa.emailsAlternativos || []).join('|'), depois = alternativos.join('|');
		if (antes !== depois) novo.emailsAlternativos = alternativos.length ? alternativos : undefined;
	}
	if (!Object.keys(novo).length) return { pessoa: pessoa, alterados: [] };

	// Registros dela: ligados pela Pessoa ou com o documento antigo (cadastros antigos sem vínculo).
	let docAntigo = pessoa.documento ? new RegExp('^' + documentoValidator.normalizarDocumento(pessoa.documento) + '$', 'i') : null;
	let dela = docAntigo ? { $or: [{ pessoa: pessoa._id }, { cpf: docAntigo }] } : { pessoa: pessoa._id };
	let eu = docAntigo ? { $or: [{ 'eu.pessoa': pessoa._id }, { 'eu.cpf': docAntigo }] } : { 'eu.pessoa': pessoa._id };

	Object.keys(novo).forEach((k) => { pessoa[k] = novo[k]; });
	if ('emailsAlternativos' in novo && !novo.emailsAlternativos) pessoa.emailsAlternativos = undefined;
	await pessoa.save();

	// Campo da Pessoa -> campo nas cópias (documento vira "cpf" em todas).
	let copia = {};
	if (novo.nome) copia.nome = novo.nome;
	if (novo.documento) copia.cpf = novo.documento;
	if (novo.email) copia.email = novo.email;
	if ('telefone' in novo) copia.telefone = novo.telefone;
	if (novo.nacionalidade) copia.nacionalidade = novo.nacionalidade;
	let so = (campos) => { let o = {}; campos.forEach((c) => { if (c in copia) o[c] = copia[c]; }); return o; };
	let prefixar = (o, p) => { let r = {}; Object.keys(o).forEach((k) => { r[p + k] = o[k]; }); return r; };

	let av = so(['nome', 'cpf', 'email', 'telefone', 'nacionalidade']);
	if (Object.keys(av).length) await Avaliador.updateMany(dela, { $set: av });
	let pa = so(['nome', 'cpf', 'email']);
	if (Object.keys(pa).length) await Participante.updateMany(dela, { $set: pa });
	let sa = so(['nome', 'cpf', 'email', 'telefone']);
	if (Object.keys(sa).length) await Saberes.updateMany(dela, { $set: sa });
	let integ = so(['nome', 'cpf', 'email', 'telefone', 'nacionalidade']);
	if (Object.keys(integ).length) {
		await Projeto.updateMany({ integrantes: { $elemMatch: dela } }, { $set: prefixar(integ, 'integrantes.$[eu].') }, { arrayFilters: [eu] });
	}
	let resp = so(['nome', 'cpf']);
	if (Object.keys(resp).length) {
		await Evento.updateMany({ responsavel: { $elemMatch: dela } }, { $set: prefixar(resp, 'responsavel.$[eu].') }, { arrayFilters: [eu] });
	}
	return { pessoa: pessoa, alterados: Object.keys(novo) };
};
