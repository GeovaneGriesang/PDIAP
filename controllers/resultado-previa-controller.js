'use strict';

// Avaliação PRÉVIA, P3: acompanhamento trabalho por trabalho (quem avalia, quem falta, notas por
// critério e parecer), média e SUGESTÃO de decisão, e as ações manuais da organização (entregar a
// alguém, tirar, reenviar aviso, pedir avaliação a mais, decidir). A decisão é sempre da
// organização e vai pros campos de sempre (Projeto.aprovado + tipoAprovacao, os mesmos de
// Projetos > Editar projetos e do envio de e-mails), não pra um campo novo.

const AvaliacaoPrevia = require('../models/avaliacao-previa-schema')
,	Projeto = require('../models/projeto-schema')
,	Avaliador = require('../models/avaliador-schema')
,	Pessoa = require('../models/pessoa-schema')
,	distribuicao = require('./distribuicao-previa-controller');

const DIA = 24 * 60 * 60 * 1000;
const DIVERGENCIA_PADRAO = 30;
const um = (n) => Math.round(n * 10) / 10;

module.exports.criterios = (mostra) => {
	let r = (mostra && mostra.resultadoPrevia) || {};
	return {
		corteAnais: typeof r.corteAnais === 'number' ? r.corteAnais : null,
		corteApresentacao: typeof r.corteApresentacao === 'number' ? r.corteApresentacao : null,
		divergencia: typeof r.divergencia === 'number' ? r.divergencia : DIVERGENCIA_PADRAO
	};
};

// Critérios vindos da tela: % entre 0 e 100 (vazio = sem corte).
module.exports.limparCriterios = (b) => {
	let pct = (v) => (v === null || v === undefined || v === '' || isNaN(Number(v)) ? undefined : Math.min(100, Math.max(0, um(Number(v)))));
	return { corteAnais: pct(b && b.corteAnais), corteApresentacao: pct(b && b.corteApresentacao), divergencia: pct(b && b.divergencia) };
};

function decisaoDe(p) {
	if (p.aprovado === true) return p.tipoAprovacao === 'apresentacao' ? 'apresentacao' : 'anais';
	if (p.aprovado === false) return 'nao';
	return null;
}

// Sugestão pela média (% da nota máxima). Sem nenhum corte configurado, não sugere.
function sugerir(pct, k) {
	if (pct === null || (k.corteAnais === null && k.corteApresentacao === null)) return null;
	if (k.corteAnais !== null && pct >= k.corteAnais) return 'anais';
	if (k.corteApresentacao !== null && pct >= k.corteApresentacao) return 'apresentacao';
	return 'nao';
}

// Tudo da tela de acompanhamento. filtroProjetos já vem com o escopo do admin (perfil.comEscopo).
module.exports.acompanhamento = async (mostra, filtroProjetos) => {
	let c = mostra.avaliacaoPrevia || {}, k = module.exports.criterios(mostra);
	let porTrabalho = c.avaliadoresPorTrabalho || 2;
	let projetos = await Projeto.find(filtroProjetos, 'nomeProjeto numInscricao categoria eixo nomeEscola textoPrevia aprovado tipoAprovacao previaExtras').lean();
	let atribs = await AvaliacaoPrevia.find({ feiraId: mostra._id }).sort({ criadoEm: 1 }).lean();
	let avaliadores = await Avaliador.find({ feiraId: mostra._id, pessoa: { $ne: null } }, 'nome email pessoa categoriasEixos aptoAvaliacaoPrevia aceitaAvaliacaoPrevia').lean();
	let pessoas = new Map((await Pessoa.find({ _id: { $in: avaliadores.map((a) => a.pessoa) } }, 'nome email').lean()).map((p) => [String(p._id), p]));
	let avPor = new Map(avaliadores.map((a) => {
		let p = pessoas.get(String(a.pessoa)) || {};
		return [String(a._id), { _id: a._id, nome: p.nome || a.nome, email: p.email || a.email }];
	}));
	let carga = new Map();
	atribs.forEach((a) => { if (distribuicao.ATIVAS.includes(a.situacao)) carga.set(String(a.avaliador), (carga.get(String(a.avaliador)) || 0) + 1); });

	let trabalhos = projetos.map((p) => {
		let avs = atribs.filter((a) => String(a.projeto) === String(p._id)).map((a) => ({
			_id: a._id, avaliador: avPor.get(String(a.avaliador)) || { _id: a.avaliador, nome: '(avaliador(a) removido(a) da Mostra)' },
			situacao: a.situacao, criadoEm: a.criadoEm, responderAte: a.responderAte, respondidoEm: a.respondidoEm, motivoRecusa: a.motivoRecusa,
			ficha: a.ficha || [], notas: a.notas || [], total: a.total, maximo: a.maximo, parecer: a.parecer, concluidoEm: a.concluidoEm, salvoEm: a.salvoEm,
			pct: a.situacao === 'concluido' && a.maximo ? um(100 * a.total / a.maximo) : null
		}));
		let ativas = avs.filter((a) => distribuicao.ATIVAS.includes(a.situacao));
		let concl = avs.filter((a) => a.pct !== null);
		let vagas = porTrabalho + Math.max(0, p.previaExtras || 0);
		let pct = concl.length ? um(concl.reduce((s, a) => s + a.pct, 0) / concl.length) : null;
		let mesmaFicha = concl.length && concl.every((a) => a.maximo === concl[0].maximo);
		let diferenca = concl.length > 1 ? um(Math.max(...concl.map((a) => a.pct)) - Math.min(...concl.map((a) => a.pct))) : null;
		let situacao = !p.textoPrevia ? 'sem-texto'
			: concl.length >= vagas ? 'avaliado'
			: ativas.length < vagas ? 'faltam-avaliadores'
			: 'em-avaliacao';
		return {
			_id: p._id, nomeProjeto: p.nomeProjeto, numInscricao: p.numInscricao, categoria: p.categoria, eixo: p.eixo, nomeEscola: p.nomeEscola,
			temTexto: !!p.textoPrevia, textoEnviadoEm: p.textoPrevia && p.textoPrevia.enviadoEm,
			vagas: vagas, extras: p.previaExtras || 0, ativas: ativas.length, concluidas: concl.length, situacao: situacao,
			pct: pct, mediaPontos: mesmaFicha ? um(concl.reduce((s, a) => s + a.total, 0) / concl.length) : null, maximo: mesmaFicha ? concl[0].maximo : null,
			diferenca: diferenca, divergente: diferenca !== null && diferenca >= k.divergencia,
			sugestao: sugerir(pct, k), sugestaoFinal: situacao === 'avaliado', decisao: decisaoDe(p), avaliacoes: avs
		};
	});
	return {
		trabalhos: trabalhos, criterios: k, porTrabalho: porTrabalho, modo: c.modo || 'convite', ativa: !!c.ativa,
		avaliadores: avaliadores.map((a) => Object.assign({}, avPor.get(String(a._id)), {
			apto: !!a.aptoAvaliacaoPrevia, seOfereceu: !!a.aceitaAvaliacaoPrevia, categoriasEixos: a.categoriasEixos || [], carga: carga.get(String(a._id)) || 0
		})).sort((x, y) => String(x.nome).localeCompare(String(y.nome), 'pt-BR'))
	};
};

// Entrega um trabalho a um(a) avaliador(a) escolhido(a) pela organização (fora da ordem automática,
// mas com as mesmas travas: da Mostra, com conta, não integrante). Quem já recusou/venceu/foi
// tirado(a) desse trabalho pode receber de novo (o registro antigo volta a valer, notas inclusive).
module.exports.atribuirManual = async (mostra, projeto, avaliadorId) => {
	let c = mostra.avaliacaoPrevia || {};
	if (!c.ativa) return { erro: 'A etapa prévia desta Mostra não está ativa.' };
	if (!projeto.textoPrevia) return { erro: 'Este trabalho ainda não enviou o texto.' };
	let av = await Avaliador.findOne({ _id: avaliadorId, feiraId: mostra._id }, 'nome pessoa cpf').lean();
	if (!av) return { erro: 'Avaliador(a) não encontrado(a) nesta Mostra.' };
	if (!av.pessoa) return { erro: 'Este(a) avaliador(a) ainda não tem conta no Meu painel.' };
	let pessoa = await Pessoa.findById(av.pessoa, 'nome email documento').lean();
	if (distribuicao.conflito(av, distribuicao.digitos((pessoa && pessoa.documento) || av.cpf), projeto)) return { erro: 'Esta pessoa é integrante do trabalho.' };
	let agora = new Date(), direto = c.modo === 'direto';
	let set = {
		pessoa: av.pessoa, situacao: direto ? 'aceito' : 'convidado', criadoEm: agora,
		responderAte: direto ? undefined : new Date(agora.getTime() + (c.diasParaAceitar || 3) * DIA),
		respondidoEm: direto ? agora : undefined, lembretes: []
	};
	let existente = await AvaliacaoPrevia.findOne({ projeto: projeto._id, avaliador: av._id });
	let atr;
	if (existente) {
		if (distribuicao.ATIVAS.includes(existente.situacao)) return { erro: 'Esta pessoa já está com este trabalho.' };
		// Quem já tinha concluído antes de ser tirado(a) volta com a avaliação concluída.
		if (existente.concluidoEm && existente.total !== undefined) { set.situacao = 'concluido'; delete set.responderAte; }
		existente.set(set);
		existente.motivoRecusa = undefined;
		atr = await existente.save();
	} else {
		atr = await AvaliacaoPrevia.create(Object.assign({ feiraId: mostra._id, projeto: projeto._id, avaliador: av._id }, set));
	}
	if (atr.situacao !== 'concluido') {
		distribuicao.avisar(direto ? 'direto' : 'convite', atr, mostra, projeto, pessoa || {}).catch(() => {});
	}
	return { ok: true, situacao: atr.situacao };
};

// Reenvia o aviso agora: convite (ainda não respondido) ou lembrete da avaliação pendente.
module.exports.lembrarUm = async (mostra, atr) => {
	if (!['convidado', 'aceito'].includes(atr.situacao)) return { erro: 'Só dá para lembrar convites aguardando resposta ou avaliações em andamento.' };
	let projeto = await Projeto.findById(atr.projeto, 'nomeProjeto categoria eixo').lean();
	let pessoa = await Pessoa.findById(atr.pessoa, 'nome email').lean();
	if (!projeto || !pessoa || !pessoa.email) return { erro: 'Esta pessoa não tem e-mail cadastrado.' };
	let tipo = atr.situacao === 'convidado' ? 'lembrete-convite' : ((mostra.avaliacaoPrevia || {}).prazoAvaliacao ? 'lembrete-prazo' : 'direto');
	let enviado = await distribuicao.avisar(tipo, atr, mostra, projeto, pessoa);
	return enviado ? { ok: true, email: pessoa.email } : { erro: 'Não foi possível enviar o e-mail agora. Tente mais tarde.' };
};

// Decisão da organização nos campos de sempre (ver routes/admin.js#/upgreice).
module.exports.decidir = (projetoId, decisao) => {
	if (decisao === 'anais' || decisao === 'apresentacao') return Projeto.updateOne({ _id: projetoId }, { $set: { aprovado: true, tipoAprovacao: decisao } });
	if (decisao === 'nao') return Projeto.updateOne({ _id: projetoId }, { $set: { aprovado: false }, $unset: { tipoAprovacao: 1 } });
	return Projeto.updateOne({ _id: projetoId }, { $unset: { aprovado: 1, tipoAprovacao: 1 } });
};
