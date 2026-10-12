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
		if (!grupos.has(chave)) grupos.set(chave, { mostra: rotulo, ano: ano || 0, papeis: [] });
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
		pessoa: pessoa ? { nome: pessoa.nome, email: pessoa.email, emailsAlternativos: pessoa.emailsAlternativos || [], telefone: pessoa.telefone, nacionalidade: pessoa.nacionalidade } : { nome: nomeRegistro },
		mostras: [...grupos.values()].sort((a, b) => b.ano - a.ano)
	};
};
