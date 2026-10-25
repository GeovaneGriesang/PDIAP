'use strict';

// Avaliação FINAL no evento pelo sistema (P4 - ver memória project-avaliacao-pelo-sistema), por
// Mostra (Feira.avaliacaoFinal). Antes do evento o sistema distribui os trabalhos APROVADOS entre
// os(as) avaliadores(as) da Mostra (mesma categoria/eixo primeiro, carga dividida conforme os turnos
// de disponibilidade) e a organização ajusta; cada pessoa avalia pela ficha no Meu painel
// (routes/painel-avaliacoes-finais.js). Ao concluir, a nota vai SOZINHA pra Projeto.avaliacao, o
// mesmo campo de Avaliação > Lançar notas e do Ranking (#publicar) - o desempate continua manual no Inserir.
//
// Ficha: parte escrita (a ficha da etapa prévia) + apresentação (fichas desta configuração). Quando a
// prévia "conta na final" e o trabalho tem avaliação prévia concluída, a parte escrita sai da ficha e
// a média da prévia soma à nota de cada avaliador(a) do evento.

const AvaliacaoFinal = require('../models/avaliacao-final-schema')
,	AvaliacaoPrevia = require('../models/avaliacao-previa-schema')
,	Feira = require('../models/feira-schema')
,	Projeto = require('../models/projeto-schema')
,	Avaliador = require('../models/avaliador-schema')
,	Pessoa = require('../models/pessoa-schema')
,	distribuicaoPrevia = require('./distribuicao-previa-controller');

// Ocupam vaga do trabalho ('removido' libera).
const ATIVAS = ['pendente', 'concluido'];
module.exports.ATIVAS = ATIVAS;
const LINK_PAINEL = (process.env.URL_SITE || 'https://movaci.com.br') + '/painel';
// Campos da Mostra que as funções daqui usam.
const CAMPOS_MOSTRA = 'nome ano categoriasEixos numAvaliadoresPorProjeto avaliacaoPrevia avaliacaoFinal distribuicaoFinal';
module.exports.CAMPOS_MOSTRA = CAMPOS_MOSTRA;

const dois = (n) => Math.round(n * 100) / 100;
const data = (v) => { if (!v) return undefined; let d = new Date(v); return isNaN(d) ? undefined : d; };
const inteiro = (v, min, max, padrao) => { let n = parseInt(v, 10); return isNaN(n) ? padrao : Math.min(max, Math.max(min, n)); };
const texto = (v, max) => (v == null ? '' : String(v).slice(0, max || 5000));
function dataBR(d) { return d ? new Date(d).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : ''; }

// Quantos(as) avaliam cada trabalho (o mesmo número de Avaliação > Lançar notas; 2 quando não gravado).
const vagas = (mostra) => (mostra && mostra.numAvaliadoresPorProjeto) || 2;
module.exports.vagas = vagas;

// --- configuração ----------------------------------------------------------------------------

// Configuração vinda do admin -> só campos conhecidos, com tipo e limites.
module.exports.limpar = (c) => {
	c = c || {};
	let fichas = (Array.isArray(c.fichas) ? c.fichas : []).slice(0, 60).map((f) => ({
		categoria: texto(f && f.categoria, 200),
		eixo: texto(f && f.eixo, 200),
		criterios: (Array.isArray(f && f.criterios) ? f.criterios : []).slice(0, 40)
			.map((k) => ({ nome: texto(k && k.nome, 300).trim(), maximo: inteiro(k && k.maximo, 0, 1000, 0) }))
			.filter((k) => k.nome && k.maximo > 0)
	})).filter((f) => f.categoria && f.criterios.length);
	return {
		ativa: c.ativa === true,
		abreEm: data(c.abreEm),
		fechaEm: data(c.fechaEm),
		soPresencaConfirmada: c.soPresencaConfirmada !== false,
		maxPorAvaliador: inteiro(c.maxPorAvaliador, 0, 200, 0),
		instrucoesAvaliador: texto(c.instrucoesAvaliador),
		publicarFichas: c.publicarFichas === true,
		fichas: fichas
	};
};

const ehExtensao = (eixo) => /extens/i.test(eixo || '');

// Ficha inicial da APRESENTAÇÃO, tirada das fichas em papel (public/views/avaliacao-*.html):
// Fundamental = apresentação (100); Médio/Técnico/Superior = comunicação oral (100), e no eixo
// Extensão + caráter extensionista (50). A organização edita.
module.exports.fichaPadrao = (categoria, eixo) => {
	if (/fundamental/i.test(categoria || '')) {
		return [
			{ nome: 'Domínio do assunto', maximo: 25 }, { nome: 'Desenvolvimento lógico de ideias e conclusões', maximo: 25 },
			{ nome: 'Criatividade (uso de recursos)', maximo: 20 }, { nome: 'Apresentação do estande', maximo: 20 }, { nome: 'Banner/cartaz', maximo: 10 }
		];
	}
	let oral = [
		{ nome: 'Domínio do assunto', maximo: 35 }, { nome: 'Desenvolvimento lógico de ideias e conclusões', maximo: 35 },
		{ nome: 'Criatividade (uso de recursos)', maximo: 20 }, { nome: 'Atende ao tempo estipulado no regulamento', maximo: 10 }
	];
	return ehExtensao(eixo) ? oral.concat([{ nome: 'Caráter extensionista', maximo: 50 }]) : oral;
};

// Ficha da apresentação que vale pra categoria+eixo: a específica do eixo, senão a da categoria.
// Categoria nunca salva: a inicial (que já traz o caráter extensionista no eixo Extensão); depois de
// salva, só vale ficha de eixo que a organização manteve.
module.exports.fichaApresentacao = (mostra, categoria, eixo) => {
	let daCategoria = (((mostra && mostra.avaliacaoFinal) || {}).fichas || []).filter((x) => x.categoria === categoria);
	let f = daCategoria.find((x) => x.eixo && x.eixo === eixo) || daCategoria.find((x) => !x.eixo);
	let criterios = f && f.criterios && f.criterios.length ? f.criterios : module.exports.fichaPadrao(categoria, eixo);
	return criterios.map((k) => ({ nome: k.nome, maximo: k.maximo }));
};

// A nota da prévia entra como parte escrita?
const escritaVemDaPrevia = (mostra) => !!(mostra && mostra.avaliacaoPrevia && mostra.avaliacaoPrevia.ativa && mostra.avaliacaoPrevia.contaNaFinal);
module.exports.escritaVemDaPrevia = escritaVemDaPrevia;

// Configuração pra tela: uma ficha por categoria (+ as específicas de eixo já salvas ou iniciais).
module.exports.paraTela = (mostra) => {
	let c = (mostra && mostra.avaliacaoFinal) || {};
	let ce = (mostra && mostra.categoriasEixos) || [];
	let salvas = c.fichas || [];
	let fichas = [];
	ce.filter((x) => x.categoria).forEach((x) => {
		if (fichas.some((f) => f.categoria === x.categoria && !f.eixo)) return;
		let s = salvas.find((f) => f.categoria === x.categoria && !f.eixo);
		let configurada = salvas.some((f) => f.categoria === x.categoria);
		fichas.push({ categoria: x.categoria, eixo: '', criterios: s ? s.criterios : module.exports.fichaPadrao(x.categoria, ''), padrao: !s });
		(x.eixos || []).forEach((eixo) => {
			let se = salvas.find((f) => f.categoria === x.categoria && f.eixo === eixo);
			if (se) fichas.push({ categoria: x.categoria, eixo: eixo, criterios: se.criterios, padrao: false });
			else if (!configurada && ehExtensao(eixo) && !/fundamental/i.test(x.categoria)) fichas.push({ categoria: x.categoria, eixo: eixo, criterios: module.exports.fichaPadrao(x.categoria, eixo), padrao: true });
		});
	});
	return {
		ativa: !!c.ativa, abreEm: c.abreEm, fechaEm: c.fechaEm, soPresencaConfirmada: c.soPresencaConfirmada !== false,
		maxPorAvaliador: c.maxPorAvaliador || 0, instrucoesAvaliador: c.instrucoesAvaliador || '', publicarFichas: !!c.publicarFichas,
		avaliadoresPorTrabalho: vagas(mostra), fichas: fichas,
		eixosPorCategoria: ce.filter((x) => x.categoria).map((x) => ({ categoria: x.categoria, eixos: x.eixos || [] })),
		escritaDaPrevia: escritaVemDaPrevia(mostra)
	};
};

// Notas abertas agora? Etapa ativa e dentro da janela (sem datas = aberta enquanto ativa).
// avaliadoEm: avaliação feita SEM INTERNET (guardada no aparelho) e enviada depois - vale a hora em
// que foi feita, desde que chegue até PRAZO_ENVIO_OFFLINE depois do encerramento.
const PRAZO_ENVIO_OFFLINE = 2 * 24 * 60 * 60 * 1000;
module.exports.aberta = (mostra, avaliadoEm) => {
	let c = (mostra && mostra.avaliacaoFinal) || {};
	if (!c.ativa) return { aberta: false, motivo: 'A avaliação no evento desta Mostra está desligada.' };
	let agora = new Date(), quando = agora;
	if (avaliadoEm && avaliadoEm < agora && c.fechaEm && agora > new Date(c.fechaEm) && agora - new Date(c.fechaEm) <= PRAZO_ENVIO_OFFLINE) quando = avaliadoEm;
	if (c.abreEm && quando < new Date(c.abreEm)) return { aberta: false, motivo: 'A avaliação abre em ' + dataBR(c.abreEm) + '.' };
	if (c.fechaEm && quando > new Date(c.fechaEm)) return { aberta: false, motivo: 'A avaliação terminou em ' + dataBR(c.fechaEm) + '.' };
	return { aberta: true };
};

// Notas recebidas (tela ou ficha em papel) conferidas contra a ficha: { notas } ou { erro }.
// Nota vazia vira null (rascunho); fora de 0..máximo é recusada.
module.exports.conferirNotas = (ficha, recebidas) => {
	recebidas = Array.isArray(recebidas) ? recebidas : [];
	if (recebidas.length !== ficha.length) return { erro: 'A ficha deste trabalho mudou. Recarregue a página e confira as notas.', mudou: true };
	let notas = [];
	for (let i = 0; i < ficha.length; i++) {
		let v = recebidas[i];
		if (v === null || v === undefined || v === '') { notas.push(null); continue; }
		let n = Number(String(v).replace(',', '.'));
		if (!isFinite(n) || n < 0 || n > ficha[i].maximo) return { erro: 'A nota de "' + ficha[i].nome + '" precisa estar entre 0 e ' + ficha[i].maximo + '.' };
		notas.push(dois(n));
	}
	return { notas: notas };
};

// Média (em pontos) das avaliações prévias concluídas, por trabalho.
module.exports.mediasPrevia = async (mostra, projetoIds) => {
	let filtro = { feiraId: mostra._id, situacao: 'concluido' };
	if (projetoIds) filtro.projeto = { $in: projetoIds };
	let soma = new Map();
	(await AvaliacaoPrevia.find(filtro, 'projeto total').lean()).forEach((a) => {
		if (typeof a.total !== 'number') return;
		let s = soma.get(String(a.projeto)) || { t: 0, n: 0 };
		s.t += a.total; s.n++;
		soma.set(String(a.projeto), s);
	});
	return new Map([...soma].map(([k, s]) => [k, dois(s.t / s.n)]));
};

// Ficha de um trabalho: escrita (se não vier da prévia) + apresentação, com a parte de cada critério.
module.exports.fichaDoProjeto = (mostra, projeto, mediaPrevia) => {
	let daPrevia = escritaVemDaPrevia(mostra) && typeof mediaPrevia === 'number';
	let apresentacao = module.exports.fichaApresentacao(mostra, projeto.categoria, projeto.eixo).map((k) => ({ nome: k.nome, maximo: k.maximo, parte: 'apresentacao' }));
	if (daPrevia) return { ficha: apresentacao, escritaDaPrevia: true };
	let escrita = distribuicaoPrevia.fichaDaCategoria(mostra, projeto.categoria).map((k) => ({ nome: k.nome, maximo: k.maximo, parte: 'escrita' }));
	return { ficha: escrita.concat(apresentacao), escritaDaPrevia: false };
};

// Ficha guardada no registro (a partir da primeira nota) ou a que vale agora.
module.exports.fichaDoRegistro = async (mostra, atr, projeto) => {
	if (atr.ficha && atr.ficha.length) return { ficha: atr.ficha.map((k) => ({ nome: k.nome, maximo: k.maximo, parte: k.parte })), escritaDaPrevia: !!atr.escritaDaPrevia };
	let media = escritaVemDaPrevia(mostra) ? (await module.exports.mediasPrevia(mostra, [projeto._id])).get(String(projeto._id)) : undefined;
	return module.exports.fichaDoProjeto(mostra, projeto, media);
};

// --- nota no ranking ---------------------------------------------------------------------------

// Grava em Projeto.avaliacao as notas das avaliações concluídas (uma por avaliador(a), na ordem em
// que concluíram, até o nº de avaliadores da Mostra) - a nota de cada um = total da ficha + média da
// prévia quando a parte escrita veio dela. A posição do desempate (índice N, lançada no Inserir) é
// preservada. Sem nenhuma concluída, só apaga notas que o próprio sistema gravou (nota lançada à mão
// no Inserir fica). Fila por trabalho: duas conclusões ao mesmo tempo não se atropelam.
const filas = new Map();
module.exports.publicar = (projetoId) => {
	let chave = String(projetoId);
	let anterior = filas.get(chave) || Promise.resolve();
	let atual = anterior.catch(() => {}).then(() => publicarAgora(projetoId));
	filas.set(chave, atual);
	atual.finally(() => { if (filas.get(chave) === atual) filas.delete(chave); }).catch(() => {});
	return atual;
};

async function publicarAgora(projetoId) {
	let p = await Projeto.findById(projetoId, 'feiraId avaliacao avaliacaoOrigem').lean();
	if (!p) return null;
	let mostra = await Feira.findById(p.feiraId, CAMPOS_MOSTRA).lean();
	let n = vagas(mostra);
	let regs = await AvaliacaoFinal.find({ projeto: p._id, situacao: 'concluido' }).sort({ concluidoEm: 1 }).lean();
	let antigas = Array.isArray(p.avaliacao) ? p.avaliacao : [];
	let desempate = antigas.length > n && antigas[n] !== null && antigas[n] !== undefined && antigas[n] !== '' ? antigas[n] : undefined;
	if (!regs.length) {
		if (p.avaliacaoOrigem !== 'sistema') return null;
		let vazio = desempate === undefined ? [] : Array(n).fill(null).concat([desempate]);
		await Projeto.updateOne({ _id: p._id }, { $set: { avaliacao: vazio }, $unset: { avaliacaoOrigem: 1 } });
		return vazio;
	}
	let media = regs.some((r) => r.escritaDaPrevia) ? (await module.exports.mediasPrevia(mostra, [p._id])).get(String(p._id)) || 0 : 0;
	let notas = regs.slice(0, n).map((r) => dois((r.total || 0) + (r.escritaDaPrevia ? media : 0)));
	if (desempate !== undefined) {
		while (notas.length < n) notas.push(null);
		notas.push(desempate);
	}
	// Nota lançada = trabalho apresentado: confirma a participação (mesma regra do PUT /addNota).
	await Projeto.updateOne({ _id: p._id }, { $set: { avaliacao: notas, avaliacaoOrigem: 'sistema', participa: true } });
	return notas;
}

// Regrava a nota de todos os trabalhos da Mostra que têm avaliação pelo sistema (ex: depois de mudar
// a etapa prévia, ou o nº de avaliadores).
module.exports.republicarMostra = async (mostra) => {
	let ids = await AvaliacaoFinal.distinct('projeto', { feiraId: mostra._id });
	let comMarca = await Projeto.distinct('_id', { feiraId: mostra._id, avaliacaoOrigem: 'sistema' });
	let todos = [...new Set(ids.concat(comMarca).map(String))];
	for (let id of todos) await module.exports.publicar(id);
	return todos.length;
};

// --- distribuição ------------------------------------------------------------------------------

const emAndamento = new Set();

// Trabalhos APROVADOS da Mostra recebem avaliadores(as) até ter N vagas ocupadas. Pode rodar quantas
// vezes for: só completa o que falta (gente tirada, trabalho aprovado depois), nunca repete a mesma
// pessoa no mesmo trabalho. Entram os(as) avaliadores(as) da Mostra com conta no Meu painel (e com
// presença confirmada, se configurado). Ordem de escolha: mesma categoria+eixo > mesma categoria >
// sem categorias informadas; depois a menor carga em proporção aos turnos em que a pessoa está
// disponível (quem fica 3 turnos recebe mais que quem fica 1); depois sorteio. Trabalhos com menos
// candidatos(as) vão primeiro.
module.exports.distribuir = async (mostraId, opcoes) => {
	opcoes = opcoes || {};
	let id = String(mostraId);
	if (emAndamento.has(id)) return { ocupado: true };
	emAndamento.add(id);
	try {
		let mostra = await Feira.findById(mostraId, CAMPOS_MOSTRA).lean();
		let c = (mostra && mostra.avaliacaoFinal) || {};
		if (!mostra || !c.ativa) return { erro: 'A avaliação no evento desta Mostra não está ativa.' };
		if (!opcoes.iniciar && !(mostra.distribuicaoFinal && mostra.distribuicaoFinal.iniciadaEm)) return { naoIniciada: true };

		let projetos = await Projeto.find({ feiraId: mostra._id, aprovado: true }, 'nomeProjeto numInscricao categoria eixo integrantes').lean();
		let filtroAv = { feiraId: mostra._id, pessoa: { $ne: null } };
		if (c.soPresencaConfirmada !== false) filtroAv.avaliacao = true;
		let avaliadores = await Avaliador.find(filtroAv, 'nome pessoa cpf categoriasEixos disponibilidade').lean();
		let pessoas = await Pessoa.find({ _id: { $in: avaliadores.map((a) => a.pessoa) } }, 'documento').lean();
		let docPor = new Map(pessoas.map((p) => [String(p._id), distribuicaoPrevia.digitos(p.documento)]));
		let peso = new Map(avaliadores.map((a) => [String(a._id), Math.max(1, (a.disponibilidade || []).length)]));

		let carga = new Map(), ocupadas = new Map(), ja = new Map();
		(await AvaliacaoFinal.find({ feiraId: mostra._id }, 'projeto avaliador situacao').lean()).forEach((a) => {
			let p = String(a.projeto), v = String(a.avaliador);
			if (!ja.has(p)) ja.set(p, new Set());
			ja.get(p).add(v);
			if (ATIVAS.includes(a.situacao)) {
				carga.set(v, (carga.get(v) || 0) + 1);
				ocupadas.set(p, (ocupadas.get(p) || 0) + 1);
			}
		});
		let n = vagas(mostra), limite = c.maxPorAvaliador || 0;
		let candidatos = (p) => avaliadores
			.filter((a) => !(ja.get(String(p._id)) || new Set()).has(String(a._id)))
			.filter((a) => !distribuicaoPrevia.conflito(a, docPor.get(String(a.pessoa)) || distribuicaoPrevia.digitos(a.cpf), p))
			.filter((a) => !limite || (carga.get(String(a._id)) || 0) < limite)
			.map((a) => ({ a: a, prio: distribuicaoPrevia.prioridade(a, p) }))
			.filter((x) => x.prio !== null);

		let pendentes = projetos.filter((p) => (ocupadas.get(String(p._id)) || 0) < n)
			.map((p) => ({ p: p, n: candidatos(p).length }))
			.sort((x, y) => x.n - y.n)
			.map((x) => x.p);

		let agora = new Date(), novas = 0, faltando = [];
		for (let p of pendentes) {
			let chave = String(p._id);
			let falta = n - (ocupadas.get(chave) || 0);
			while (falta > 0) {
				let lista = candidatos(p).map((x) => ({ a: x.a, prio: x.prio, carga: (carga.get(String(x.a._id)) || 0) / peso.get(String(x.a._id)), sorte: Math.random() }))
					.sort((x, y) => (x.prio - y.prio) || (x.carga - y.carga) || (x.sorte - y.sorte));
				if (!lista.length) break;
				let a = lista[0].a;
				if (!ja.has(chave)) ja.set(chave, new Set());
				ja.get(chave).add(String(a._id));
				try {
					await AvaliacaoFinal.create({ feiraId: mostra._id, projeto: p._id, avaliador: a._id, pessoa: a.pessoa, situacao: 'pendente', origem: 'auto', criadoEm: agora });
					carga.set(String(a._id), (carga.get(String(a._id)) || 0) + 1);
					novas++;
					falta--;
				} catch (e) {
					if (e.code !== 11000) throw e; // já existia (outra rodada ao mesmo tempo): tenta o(a) próximo(a)
				}
			}
			if (falta > 0) faltando.push({ projeto: p._id, nomeProjeto: p.nomeProjeto, numInscricao: p.numInscricao, categoria: p.categoria, eixo: p.eixo, faltam: falta });
		}

		let estado = { iniciadaEm: (mostra.distribuicaoFinal && mostra.distribuicaoFinal.iniciadaEm) || agora, ultimaEm: agora, faltando: faltando };
		await Feira.updateOne({ _id: mostra._id }, { $set: { distribuicaoFinal: estado } });
		return { novas: novas, faltando: faltando, trabalhos: projetos.length, avaliadores: avaliadores.length };
	} finally {
		emAndamento.delete(id);
	}
};

// Completa vagas liberadas, se a organização já distribuiu (não roda sozinha antes disso).
module.exports.completar = (mostra) => {
	if (!(mostra && mostra.distribuicaoFinal && mostra.distribuicaoFinal.iniciadaEm)) return;
	module.exports.distribuir(mostra._id).catch((e) => console.error('Erro ao completar a distribuição da avaliação final', e));
};

// Resumo pra tela de configuração.
module.exports.resumo = async (mostra) => {
	let contagem = {};
	(await AvaliacaoFinal.aggregate([{ $match: { feiraId: mostra._id } }, { $group: { _id: '$situacao', n: { $sum: 1 } } }]))
		.forEach((x) => { contagem[x._id] = x.n; });
	let c = mostra.avaliacaoFinal || {};
	let filtroAv = { feiraId: mostra._id, pessoa: { $ne: null } };
	if (c.soPresencaConfirmada !== false) filtroAv.avaliacao = true;
	let d = mostra.distribuicaoFinal || {};
	return {
		situacoes: contagem, iniciadaEm: d.iniciadaEm, ultimaEm: d.ultimaEm, faltando: d.faltando || [],
		trabalhosAprovados: await Projeto.countDocuments({ feiraId: mostra._id, aprovado: true }),
		avaliadoresQueEntram: await Avaliador.countDocuments(filtroAv),
		avaliadoresSemConta: await Avaliador.countDocuments({ feiraId: mostra._id, pessoa: null }),
		avisosPendentes: (await AvaliacaoFinal.distinct('pessoa', { feiraId: mostra._id, situacao: 'pendente', avisadoEm: { $exists: false } })).length
	};
};

// --- e-mail ------------------------------------------------------------------------------------

// Um e-mail por pessoa com os trabalhos ainda não avisados (e a lista completa dela). Volta quantas
// pessoas foram avisadas. Nunca manda duas vezes o mesmo trabalho: marca avisadoEm antes de enviar.
module.exports.avisar = async (mostra) => {
	let novos = await AvaliacaoFinal.find({ feiraId: mostra._id, situacao: 'pendente', avisadoEm: { $exists: false } }, 'pessoa').lean();
	let pessoasIds = [...new Set(novos.map((a) => String(a.pessoa)))];
	let agora = new Date(), avisadas = 0;
	let c = mostra.avaliacaoFinal || {};
	let quando = c.abreEm ? ' A ficha abre para notas em ' + dataBR(c.abreEm) + (c.fechaEm ? ' e fecha em ' + dataBR(c.fechaEm) : '') + '.' : '';
	for (let pid of pessoasIds) {
		let r = await AvaliacaoFinal.updateMany({ feiraId: mostra._id, pessoa: pid, situacao: 'pendente', avisadoEm: { $exists: false } }, { $set: { avisadoEm: agora } });
		if (!r.modifiedCount) continue;
		let pessoa = await Pessoa.findById(pid, 'nome email').lean();
		if (!pessoa || !pessoa.email) continue;
		let todos = await AvaliacaoFinal.find({ feiraId: mostra._id, pessoa: pid, situacao: { $in: ATIVAS } }, 'projeto').lean();
		let projetos = await Projeto.find({ _id: { $in: todos.map((a) => a.projeto) } }, 'nomeProjeto numInscricao categoria').sort({ numInscricao: 1 }).lean();
		let lista = projetos.map((p) => (p.numInscricao ? 'nº ' + p.numInscricao + ' - ' : '') + p.nomeProjeto + ' (' + (p.categoria || '') + ')');
		let enviado = await distribuicaoPrevia.enviarEmail(pessoa.email, 'MOVACI - Trabalhos para avaliar no evento', {
			titulo: 'Trabalhos para avaliar no evento', nome: pessoa.nome || '', url: LINK_PAINEL, rotuloBotao: 'Abrir o Meu painel',
			paragrafos: [
				'Na ' + mostra.nome + ' você vai avaliar ' + (lista.length === 1 ? 'o trabalho' : 'os ' + lista.length + ' trabalhos') + ' abaixo. A avaliação é feita no próprio sistema: no estande, abra o Meu painel (dá para usar o celular) e preencha a ficha.' + quando,
				lista.join('; ') + '.'
			]
		});
		if (enviado) avisadas++;
		else await AvaliacaoFinal.updateMany({ feiraId: mostra._id, pessoa: pid, avisadoEm: agora }, { $unset: { avisadoEm: 1 } });
	}
	return avisadas;
};

// --- acompanhamento e ações da organização ----------------------------------------------------------

// Tudo da tela de acompanhamento. filtroProjetos já vem com o escopo do admin (perfil.comEscopo).
module.exports.acompanhamento = async (mostra, filtroProjetos) => {
	let n = vagas(mostra);
	let projetos = await Projeto.find(filtroProjetos, 'nomeProjeto numInscricao categoria eixo nomeEscola aprovado avaliacao avaliacaoOrigem').lean();
	let atribs = await AvaliacaoFinal.find({ feiraId: mostra._id }).sort({ criadoEm: 1 }).lean();
	// Trabalho que não está mais aprovado mas tem avaliação no sistema também aparece.
	let comAvaliacao = new Set(atribs.map((a) => String(a.projeto)));
	projetos = projetos.filter((p) => p.aprovado === true || comAvaliacao.has(String(p._id)));
	let medias = await module.exports.mediasPrevia(mostra);
	let avaliadores = await Avaliador.find({ feiraId: mostra._id }, 'nome email pessoa categoriasEixos disponibilidade avaliacao').lean();
	let pessoas = new Map((await Pessoa.find({ _id: { $in: avaliadores.map((a) => a.pessoa).filter(Boolean) } }, 'nome email').lean()).map((p) => [String(p._id), p]));
	let avPor = new Map(avaliadores.map((a) => {
		let p = pessoas.get(String(a.pessoa)) || {};
		return [String(a._id), { _id: a._id, nome: p.nome || a.nome, email: p.email || a.email }];
	}));
	let pend = new Map(), concl = new Map();
	atribs.forEach((a) => {
		let v = String(a.avaliador);
		if (a.situacao === 'pendente') pend.set(v, (pend.get(v) || 0) + 1);
		if (a.situacao === 'concluido') concl.set(v, (concl.get(v) || 0) + 1);
	});

	let trabalhos = projetos.map((p) => {
		let media = medias.has(String(p._id)) ? medias.get(String(p._id)) : null;
		let avs = atribs.filter((a) => String(a.projeto) === String(p._id)).map((a) => ({
			_id: a._id, avaliador: avPor.get(String(a.avaliador)) || { _id: a.avaliador, nome: '(avaliador(a) removido(a) da Mostra)' },
			situacao: a.situacao, origem: a.origem, criadoEm: a.criadoEm, removidoEm: a.removidoEm, avisadoEm: a.avisadoEm,
			// Ficha guardada a partir da primeira nota; antes disso, a que vale agora (pra lançar a ficha em papel).
			ficha: a.ficha && a.ficha.length ? a.ficha : module.exports.fichaDoProjeto(mostra, p, media === null ? undefined : media).ficha, notas: a.notas || [], total: a.total, maximo: a.maximo, parecer: a.parecer, salvoEm: a.salvoEm, concluidoEm: a.concluidoEm,
			escritaDaPrevia: !!a.escritaDaPrevia, origemNotas: a.origemNotas, avaliadoEm: a.avaliadoEm, lancadoPor: a.lancadoPor,
			nota: a.situacao === 'concluido' ? dois((a.total || 0) + (a.escritaDaPrevia ? (media || 0) : 0)) : null
		}));
		let ativas = avs.filter((a) => ATIVAS.includes(a.situacao));
		let feitas = avs.filter((a) => a.situacao === 'concluido');
		let notasRanking = Array.isArray(p.avaliacao) ? p.avaliacao : [];
		let situacao = p.aprovado !== true ? 'nao-aprovado'
			: feitas.length >= n ? 'avaliado'
			: ativas.length < n ? 'faltam-avaliadores'
			: 'em-avaliacao';
		return {
			_id: p._id, nomeProjeto: p.nomeProjeto, numInscricao: p.numInscricao, categoria: p.categoria, eixo: p.eixo, nomeEscola: p.nomeEscola,
			vagas: n, ativas: ativas.length, concluidas: feitas.length, situacao: situacao, mediaPrevia: media,
			notasRanking: notasRanking, somaRanking: dois(notasRanking.reduce((s, x) => s + (Number(x) || 0), 0)),
			// Só notas do Inserir (nenhuma avaliação pelo sistema) / notas do sistema mexidas depois no Inserir.
			notaManual: notasRanking.length > 0 && p.avaliacaoOrigem !== 'sistema' && !feitas.length,
			editadaNoInserir: notasRanking.length > 0 && p.avaliacaoOrigem !== 'sistema' && feitas.length > 0, avaliacoes: avs
		};
	});
	return {
		trabalhos: trabalhos, vagas: n, ativa: !!(mostra.avaliacaoFinal || {}).ativa, escritaDaPrevia: escritaVemDaPrevia(mostra),
		iniciada: !!(mostra.distribuicaoFinal && mostra.distribuicaoFinal.iniciadaEm),
		avaliadores: avaliadores.map((a) => Object.assign({}, avPor.get(String(a._id)), {
			temConta: !!a.pessoa, presente: !!a.avaliacao, categoriasEixos: a.categoriasEixos || [], turnos: (a.disponibilidade || []).length,
			pendentes: pend.get(String(a._id)) || 0, concluidas: concl.get(String(a._id)) || 0
		})).sort((x, y) => String(x.nome).localeCompare(String(y.nome), 'pt-BR'))
	};
};

// Entrega um trabalho a um(a) avaliador(a) escolhido(a) pela organização (fora da ordem automática,
// mas com as mesmas travas: da Mostra, com conta, não integrante, vaga livre). Quem foi tirado(a)
// desse trabalho pode receber de novo: o registro antigo volta a valer, notas inclusive.
module.exports.atribuirManual = async (mostra, projeto, avaliadorId) => {
	if (!(mostra.avaliacaoFinal || {}).ativa) return { erro: 'A avaliação no evento desta Mostra não está ativa.' };
	if (projeto.aprovado !== true) return { erro: 'Este trabalho não está aprovado.' };
	let av = await Avaliador.findOne({ _id: avaliadorId, feiraId: mostra._id }, 'nome pessoa cpf').lean();
	if (!av) return { erro: 'Avaliador(a) não encontrado(a) nesta Mostra.' };
	if (!av.pessoa) return { erro: 'Este(a) avaliador(a) ainda não tem conta no Meu painel.' };
	let pessoa = await Pessoa.findById(av.pessoa, 'documento').lean();
	if (distribuicaoPrevia.conflito(av, distribuicaoPrevia.digitos((pessoa && pessoa.documento) || av.cpf), projeto)) return { erro: 'Esta pessoa é integrante do trabalho.' };
	let ocupadas = await AvaliacaoFinal.countDocuments({ projeto: projeto._id, situacao: { $in: ATIVAS } });
	if (ocupadas >= vagas(mostra)) return { erro: 'Este trabalho já tem ' + vagas(mostra) + ' avaliador(a)(es). Tire alguém antes de entregar a outra pessoa.' };
	let existente = await AvaliacaoFinal.findOne({ projeto: projeto._id, avaliador: av._id });
	if (existente) {
		if (ATIVAS.includes(existente.situacao)) return { erro: 'Esta pessoa já está com este trabalho.' };
		existente.situacao = existente.concluidoEm && typeof existente.total === 'number' ? 'concluido' : 'pendente';
		existente.pessoa = av.pessoa;
		existente.removidoEm = undefined;
		await existente.save();
		if (existente.situacao === 'concluido') await module.exports.publicar(projeto._id);
		return { ok: true, situacao: existente.situacao };
	}
	await AvaliacaoFinal.create({ feiraId: mostra._id, projeto: projeto._id, avaliador: av._id, pessoa: av.pessoa, situacao: 'pendente', origem: 'manual', criadoEm: new Date() });
	return { ok: true, situacao: 'pendente' };
};

// Tira o trabalho da pessoa (a nota, se havia, deixa de contar). A vaga fica aberta pra organização
// entregar a quem quiser (ou "Completar a distribuição") - completar sozinho aqui atropelaria a troca
// por uma pessoa escolhida.
module.exports.remover = async (atr) => {
	if (!ATIVAS.includes(atr.situacao)) return { erro: 'Este trabalho já não está com esta pessoa.' };
	await AvaliacaoFinal.updateOne({ _id: atr._id }, { $set: { situacao: 'removido', removidoEm: new Date() } });
	if (atr.situacao === 'concluido') await module.exports.publicar(atr.projeto);
	return { ok: true };
};

// Volta uma avaliação concluída pra pendente (a pessoa corrige e conclui de novo); a nota sai do
// ranking até lá.
module.exports.reabrir = async (atr) => {
	if (atr.situacao !== 'concluido') return { erro: 'Só dá para reabrir uma avaliação concluída.' };
	await AvaliacaoFinal.updateOne({ _id: atr._id }, { $set: { situacao: 'pendente' }, $unset: { concluidoEm: 1 } });
	await module.exports.publicar(atr.projeto);
	return { ok: true };
};

// Pessoa que não veio (ou saiu): tira todos os trabalhos AINDA NÃO avaliados dela e completa as vagas.
module.exports.liberarPendentes = async (mostra, avaliadorId) => {
	let r = await AvaliacaoFinal.updateMany({ feiraId: mostra._id, avaliador: avaliadorId, situacao: 'pendente' }, { $set: { situacao: 'removido', removidoEm: new Date() } });
	if (r.modifiedCount) module.exports.completar(mostra);
	return { liberados: r.modifiedCount };
};

// --- fichas impressas e ficha em papel ------------------------------------------------------------

// Partes da ficha agrupadas pra impressão: [{ rotulo, criterios: [{nome, maximo}] }].
function partesDaFicha(ficha) {
	return [['escrita', 'Parte escrita'], ['apresentacao', 'Apresentação']].map(([chave, rotulo]) => ({
		rotulo: rotulo, criterios: ficha.filter((k) => (k.parte || 'apresentacao') === chave).map((k) => ({ nome: k.nome, maximo: k.maximo }))
	})).filter((p) => p.criterios.length);
}

// Fichas EM BRANCO da Mostra, uma por categoria (e as específicas de eixo) - publicadas no menu
// Documentos quando a organização autoriza (avaliacaoFinal.publicarFichas). A parte escrita sai da
// ficha da etapa prévia; quando ela vale na final, vai junto com a observação.
module.exports.fichasModelo = (mostra) => {
	let escritaPrevia = escritaVemDaPrevia(mostra);
	return module.exports.paraTela(mostra).fichas.map((f) => {
		let escrita = distribuicaoPrevia.fichaDaCategoria(mostra, f.categoria).map((k) => ({ nome: k.nome, maximo: k.maximo, parte: 'escrita' }));
		let apresentacao = module.exports.fichaApresentacao(mostra, f.categoria, f.eixo || '').map((k) => ({ nome: k.nome, maximo: k.maximo, parte: 'apresentacao' }));
		return {
			categoria: f.categoria, eixo: f.eixo || '', partes: partesDaFicha(escrita.concat(apresentacao)),
			observacao: escritaPrevia ? 'A parte escrita é avaliada antes do evento (etapa prévia) e a média entra na nota final. No evento, avalia-se a apresentação.' : ''
		};
	});
};

// Trabalhos AINDA NÃO AVALIADOS de cada avaliador(a), com a ficha de cada um, pra imprimir (plano B
// sem internet). avaliadorId opcional: só daquela pessoa.
module.exports.fichasParaImprimir = async (mostra, avaliadorId) => {
	let filtro = { feiraId: mostra._id, situacao: 'pendente' };
	if (avaliadorId) filtro.avaliador = avaliadorId;
	let atribs = await AvaliacaoFinal.find(filtro).lean();
	let projetos = new Map((await Projeto.find({ _id: { $in: atribs.map((a) => a.projeto) } }, 'nomeProjeto numInscricao categoria eixo nomeEscola').lean()).map((p) => [String(p._id), p]));
	let avaliadores = await Avaliador.find({ _id: { $in: atribs.map((a) => a.avaliador) } }, 'nome pessoa').lean();
	let pessoas = new Map((await Pessoa.find({ _id: { $in: avaliadores.map((a) => a.pessoa).filter(Boolean) } }, 'nome').lean()).map((p) => [String(p._id), p.nome]));
	let nomeAv = new Map(avaliadores.map((a) => [String(a._id), pessoas.get(String(a.pessoa)) || a.nome || '']));
	let grupos = new Map();
	for (let a of atribs) {
		let p = projetos.get(String(a.projeto));
		if (!p) continue;
		let f = await module.exports.fichaDoRegistro(mostra, a, p);
		let chave = String(a.avaliador);
		if (!grupos.has(chave)) grupos.set(chave, { avaliador: nomeAv.get(chave) || '', fichas: [] });
		grupos.get(chave).fichas.push({ projeto: p, partes: partesDaFicha(f.ficha), escritaDaPrevia: f.escritaDaPrevia });
	}
	return [...grupos.values()]
		.map((g) => Object.assign(g, { fichas: g.fichas.sort((x, y) => (x.projeto.numInscricao || 0) - (y.projeto.numInscricao || 0)) }))
		.sort((x, y) => x.avaliador.localeCompare(y.avaliador, 'pt-BR'));
};

// A organização lança a ficha preenchida em papel: todas as notas, conclui e manda pro ranking -
// vale mesmo com a avaliação já encerrada (é o plano B do dia).
module.exports.lancarPapel = async (atr, mostra, recebidas, parecer, quem) => {
	if (!ATIVAS.includes(atr.situacao)) return { erro: 'Este trabalho não está mais com esta pessoa.' };
	let projeto = await Projeto.findById(atr.projeto, 'categoria eixo').lean();
	if (!projeto) return { erro: 'Trabalho não encontrado.' };
	let f = await module.exports.fichaDoRegistro(mostra, atr, projeto);
	let c = module.exports.conferirNotas(f.ficha, recebidas);
	if (c.erro) return { erro: c.erro };
	if (c.notas.some((n) => n === null)) return { erro: 'Preencha a nota de todos os critérios da ficha.' };
	let agora = new Date();
	let r = await AvaliacaoFinal.updateOne({ _id: atr._id, situacao: { $in: ATIVAS } }, { $set: {
		ficha: f.ficha, escritaDaPrevia: f.escritaDaPrevia, notas: c.notas, parecer: texto(parecer), total: dois(c.notas.reduce((s, n) => s + n, 0)),
		maximo: f.ficha.reduce((s, k) => s + k.maximo, 0), situacao: 'concluido', salvoEm: agora, concluidoEm: atr.concluidoEm || agora,
		origemNotas: 'papel', lancadoPor: texto(quem, 200)
	}, $unset: { avaliadoEm: 1 } });
	if (!r.matchedCount) return { erro: 'Este trabalho mudou de situação. Atualize a página.' };
	await module.exports.publicar(atr.projeto);
	return { ok: true };
};
