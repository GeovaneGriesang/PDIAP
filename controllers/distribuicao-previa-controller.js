'use strict';

// Avaliação PRÉVIA, P2 (ver controllers/avaliacao-previa-controller.js pra configuração/envio do
// texto): distribuição automática dos trabalhos entre os(as) avaliadores(as) aprovados(as),
// convites com prazo de aceite e substituição, lembretes por e-mail e regras da avaliação pela
// ficha. Os registros ficam em models/avaliacao-previa-schema.js.

const path = require('path')
,	nodemailer = require('nodemailer')
,	EmailTemplate = require('../utils/emailTemplate').EmailTemplate
,	AvaliacaoPrevia = require('../models/avaliacao-previa-schema')
,	Feira = require('../models/feira-schema')
,	Projeto = require('../models/projeto-schema')
,	Avaliador = require('../models/avaliador-schema')
,	Pessoa = require('../models/pessoa-schema')
,	config = require('./avaliacao-previa-controller');

// Ocupam vaga do trabalho (os demais - recusado, expirado, removido - liberam pra substituição).
const ATIVAS = ['convidado', 'aceito', 'concluido'];
module.exports.ATIVAS = ATIVAS;
const DIA = 24 * 60 * 60 * 1000;
const LINK_PAINEL = (process.env.URL_SITE || 'https://movaci.com.br') + '/painel';

// Ficha (critérios) que vale pra uma categoria da Mostra: a salva pela organização ou a inicial.
module.exports.fichaDaCategoria = (mostra, categoria) => {
	let f = (((mostra && mostra.avaliacaoPrevia) || {}).fichas || []).find((x) => x.categoria === categoria);
	let criterios = f && f.criterios && f.criterios.length ? f.criterios : config.fichaPadrao(categoria || '');
	return criterios.map((k) => ({ nome: k.nome, maximo: k.maximo }));
};

// Avaliação aberta pra nota? Etapa ativa e dentro do prazo da avaliação (sem prazo = aberta).
module.exports.avaliacaoAberta = (mostra) => {
	let c = (mostra && mostra.avaliacaoPrevia) || {};
	if (!c.ativa) return { aberta: false, motivo: 'A etapa prévia desta Mostra está desligada.' };
	if (c.prazoAvaliacao && new Date() > new Date(c.prazoAvaliacao)) {
		return { aberta: false, motivo: 'O prazo da avaliação terminou em ' + dataBR(c.prazoAvaliacao) + '.' };
	}
	return { aberta: true };
};

// E-mail no modelo templates/aviso-conta (título, parágrafos e botão). Nunca rejeita: falha de
// envio só vai pro log (a atribuição continua valendo e aparece no painel de qualquer jeito).
let transporte = null;
module.exports.enviarEmail = (para, assunto, locals) => new Promise((resolve) => {
	if (!para) return resolve(false);
	if (!transporte) {
		transporte = nodemailer.createTransport({ host: 'smtp.gmail.com', port: 587, auth: { user: process.env.SMTP_GMAIL_USER, pass: process.env.SMTP_GMAIL_PASS } });
	}
	new EmailTemplate(path.join(__dirname, '..', 'templates', 'aviso-conta')).render(locals, (err, results) => {
		if (err) { console.error('Erro ao montar e-mail da avaliação prévia', err); return resolve(false); }
		transporte.sendMail({ from: 'MOVACI <va-movaci@ifsul.edu.br>', to: para, subject: assunto, html: results.html, text: results.text }, (erro) => {
			if (erro) console.error('Erro ao enviar e-mail da avaliação prévia:', erro.message || erro);
			resolve(!erro);
		});
	});
});

function dataBR(d) { return d ? new Date(d).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : ''; }

// Texto de cada aviso.
function mensagem(tipo, atr, mostra, projeto, pessoa) {
	let c = mostra.avaliacaoPrevia || {};
	let trabalho = '"' + (projeto.nomeProjeto || 'Trabalho') + '" (' + (projeto.categoria || '') + (projeto.eixo ? ' - ' + projeto.eixo : '') + ')';
	let prazo = c.prazoAvaliacao ? ' O prazo da avaliação é ' + dataBR(c.prazoAvaliacao) + '.' : '';
	let m = {
		convite: ['Convite para avaliar um trabalho', [
			'Você foi convidado(a) para avaliar, na etapa prévia da ' + mostra.nome + ', o trabalho ' + trabalho + '.',
			'Entre no Meu painel para aceitar ou recusar até ' + dataBR(atr.responderAte) + '. Sem resposta até lá, o trabalho vai para outra pessoa.' + prazo]],
		direto: ['Novo trabalho para avaliar', [
			'Você recebeu, na etapa prévia da ' + mostra.nome + ', o trabalho ' + trabalho + ' para avaliar.',
			'O texto e a ficha de avaliação estão no Meu painel.' + prazo]],
		'lembrete-convite': ['Lembrete: convite para avaliar', [
			'O convite para avaliar o trabalho ' + trabalho + ' (' + mostra.nome + ') vence em ' + dataBR(atr.responderAte) + '.',
			'Entre no Meu painel para aceitar ou recusar.']],
		'lembrete-prazo': ['Lembrete: avaliação pendente', [
			'A avaliação do trabalho ' + trabalho + ' (' + mostra.nome + ') ainda não foi concluída.',
			'O prazo termina em ' + dataBR(c.prazoAvaliacao) + '. A ficha está no Meu painel.']]
	}[tipo];
	return { assunto: 'MOVACI - ' + m[0], locals: { titulo: m[0], nome: pessoa.nome || '', paragrafos: m[1], url: LINK_PAINEL, rotuloBotao: 'Abrir o Meu painel' } };
}

function avisar(tipo, atr, mostra, projeto, pessoa) {
	let m = mensagem(tipo, atr, mostra, projeto, pessoa);
	return module.exports.enviarEmail(pessoa.email, m.assunto, m.locals);
}

// Convites sem resposta no prazo liberam a vaga.
module.exports.expirarConvites = async (feiraId) => {
	let filtro = { situacao: 'convidado', responderAte: { $lt: new Date() } };
	if (feiraId) filtro.feiraId = feiraId;
	return (await AvaliacaoPrevia.updateMany(filtro, { $set: { situacao: 'expirado', respondidoEm: new Date() } })).modifiedCount;
};

const digitos = (v) => String(v || '').replace(/\D/g, '');

// Avaliador(a) só recebe trabalho do eixo em que se inscreveu (mesma categoria E eixo) - decisão da
// organização (reunião de 20/10/2026): sem gente suficiente no eixo, o trabalho fica faltando e a
// organização entrega à mão. 1 = serve; null = não serve. (Antes completava com a mesma categoria e
// com quem não informou categorias.)
function prioridade(avaliador, projeto) {
	let ce = avaliador.categoriasEixos || [];
	return ce.some((x) => x.categoria === projeto.categoria && x.eixo === projeto.eixo) ? 1 : null;
}

// Eixos (categoria|eixo) em que cada pessoa tem projeto na Mostra, por Pessoa e por documento - pra
// regra "não avaliar no eixo do próprio projeto" (Mostra sem permitirEixoProprio).
function eixosComProjeto(projetosDaMostra) {
	let porChave = new Map();
	let marcar = (k, ce) => { if (!k) return; if (!porChave.has(k)) porChave.set(k, new Set()); porChave.get(k).add(ce); };
	(projetosDaMostra || []).forEach((p) => {
		let ce = (p.categoria || '') + '|' + (p.eixo || '');
		(p.integrantes || []).forEach((i) => { marcar(i.pessoa && 'p:' + i.pessoa, ce); marcar(digitos(i.cpf) && 'd:' + digitos(i.cpf), ce); });
	});
	return porChave;
}

// Tem projeto no mesmo categoria|eixo do trabalho.
function conflitoEixo(avaliador, documento, projeto, eixos) {
	let ce = (projeto.categoria || '') + '|' + (projeto.eixo || '');
	let tem = (k) => !!k && eixos.has(k) && eixos.get(k).has(ce);
	return tem(avaliador.pessoa && 'p:' + avaliador.pessoa) || tem(documento && 'd:' + documento);
}

// Integrante do próprio trabalho não avalia (pela Pessoa ou pelo documento).
function conflito(avaliador, documento, projeto) {
	return (projeto.integrantes || []).some((i) =>
		(i.pessoa && String(i.pessoa) === String(avaliador.pessoa)) || (documento && digitos(i.cpf) === documento));
}

const emAndamento = new Set();

// Distribui os trabalhos COM TEXTO da Mostra entre os(as) avaliadores(as) aprovados(as) até cada um
// ter `avaliadoresPorTrabalho` vagas ocupadas. Pode rodar quantas vezes for: só completa o que
// falta (recusas, convites vencidos, textos novos), nunca repete a mesma pessoa no mesmo trabalho.
// Só quem se inscreveu na mesma categoria+eixo (e, se a Mostra não permite, quem não tem projeto
// nesse eixo); entre esses, quem recebeu menos trabalhos; depois sorteio. Trabalhos com menos candidatos(as) vão primeiro.
// opcoes.iniciar = a organização mandou distribuir (liga a substituição automática); sem ele
// (agendador), só roda se a organização já ligou.
module.exports.distribuir = async (mostraId, opcoes) => {
	opcoes = opcoes || {};
	let id = String(mostraId);
	if (emAndamento.has(id)) return { ocupado: true };
	emAndamento.add(id);
	try {
		let mostra = await Feira.findById(mostraId).lean();
		let c = (mostra && mostra.avaliacaoPrevia) || {};
		if (!mostra || !c.ativa) return { erro: 'A etapa prévia desta Mostra não está ativa.' };
		if (!opcoes.iniciar && !(mostra.distribuicaoPrevia && mostra.distribuicaoPrevia.iniciadaEm)) return { naoIniciada: true };
		await module.exports.expirarConvites(mostra._id);

		let projetos = await Projeto.find({ feiraId: mostra._id, 'textoPrevia.enviadoEm': { $exists: true } }, 'nomeProjeto numInscricao categoria eixo integrantes previaExtras').lean();
		let avaliadores = await Avaliador.find({ feiraId: mostra._id, aptoAvaliacaoPrevia: true, pessoa: { $ne: null } }, 'nome pessoa cpf categoriasEixos').lean();
		let eixos = c.permitirEixoProprio ? null : eixosComProjeto(await Projeto.find({ feiraId: mostra._id }, 'categoria eixo integrantes.pessoa integrantes.cpf').lean());
		let pessoas = await Pessoa.find({ _id: { $in: avaliadores.map((a) => a.pessoa) } }, 'nome email documento').lean();
		let pessoaPor = new Map(pessoas.map((p) => [String(p._id), p]));
		let docPor = new Map(avaliadores.map((a) => { let p = pessoaPor.get(String(a.pessoa)); return [String(a._id), digitos((p && p.documento) || a.cpf)]; }));

		let carga = new Map(), ocupadas = new Map(), ja = new Map();
		(await AvaliacaoPrevia.find({ feiraId: mostra._id }, 'projeto avaliador situacao').lean()).forEach((a) => {
			let p = String(a.projeto), v = String(a.avaliador);
			if (!ja.has(p)) ja.set(p, new Set());
			ja.get(p).add(v);
			if (ATIVAS.includes(a.situacao)) {
				carga.set(v, (carga.get(v) || 0) + 1);
				ocupadas.set(p, (ocupadas.get(p) || 0) + 1);
			}
		});
		let porTrabalho = c.avaliadoresPorTrabalho || 2, limite = c.maxPorAvaliador || 0;
		let vagas = (p) => porTrabalho + Math.max(0, p.previaExtras || 0);
		let candidatos = (p) => avaliadores
			.filter((a) => !(ja.get(String(p._id)) || new Set()).has(String(a._id)))
			.filter((a) => !conflito(a, docPor.get(String(a._id)), p))
			.filter((a) => !eixos || !conflitoEixo(a, docPor.get(String(a._id)), p, eixos))
			.filter((a) => !limite || (carga.get(String(a._id)) || 0) < limite)
			.map((a) => ({ a: a, prio: prioridade(a, p) }))
			.filter((x) => x.prio !== null);

		let pendentes = projetos.filter((p) => (ocupadas.get(String(p._id)) || 0) < vagas(p))
			.map((p) => ({ p: p, n: candidatos(p).length }))
			.sort((x, y) => x.n - y.n)
			.map((x) => x.p);

		let agora = new Date(), novas = [], faltando = [];
		for (let p of pendentes) {
			let chave = String(p._id);
			let falta = vagas(p) - (ocupadas.get(chave) || 0);
			while (falta > 0) {
				let lista = candidatos(p).map((x) => ({ a: x.a, prio: x.prio, carga: carga.get(String(x.a._id)) || 0, sorte: Math.random() }))
					.sort((x, y) => (x.prio - y.prio) || (x.carga - y.carga) || (x.sorte - y.sorte));
				if (!lista.length) break;
				let a = lista[0].a;
				if (!ja.has(chave)) ja.set(chave, new Set());
				ja.get(chave).add(String(a._id));
				try {
					let atr = await AvaliacaoPrevia.create({
						feiraId: mostra._id, projeto: p._id, avaliador: a._id, pessoa: a.pessoa,
						situacao: c.modo === 'direto' ? 'aceito' : 'convidado', criadoEm: agora,
						responderAte: c.modo === 'direto' ? undefined : new Date(agora.getTime() + (c.diasParaAceitar || 3) * DIA),
						respondidoEm: c.modo === 'direto' ? agora : undefined
					});
					novas.push({ atr: atr, projeto: p, pessoa: pessoaPor.get(String(a.pessoa)) || {} });
					carga.set(String(a._id), (carga.get(String(a._id)) || 0) + 1);
					falta--;
				} catch (e) {
					if (e.code !== 11000) throw e; // já existia (outra rodada ao mesmo tempo): tenta o(a) próximo(a)
				}
			}
			if (falta > 0) faltando.push({ projeto: p._id, nomeProjeto: p.nomeProjeto, numInscricao: p.numInscricao, categoria: p.categoria, eixo: p.eixo, faltam: falta });
		}

		let estado = { iniciadaEm: (mostra.distribuicaoPrevia && mostra.distribuicaoPrevia.iniciadaEm) || agora, ultimaEm: agora, faltando: faltando };
		await Feira.updateOne({ _id: mostra._id }, { $set: { distribuicaoPrevia: estado } });

		// E-mails depois de gravar tudo, um por vez, sem segurar a resposta da tela.
		let envio = (async () => {
			for (let n of novas) await avisar(c.modo === 'direto' ? 'direto' : 'convite', n.atr, mostra, n.projeto, n.pessoa);
		})().catch((e) => console.error('Erro ao avisar avaliadores(as) da etapa prévia', e));
		if (opcoes.esperarEmails) await envio;
		return { novas: novas.length, faltando: faltando, trabalhos: projetos.length, avaliadores: avaliadores.length };
	} finally {
		emAndamento.delete(id);
	}
};

// Pausa a substituição automática (o que já foi entregue continua valendo).
module.exports.pausar = (mostraId) => Feira.updateOne({ _id: mostraId }, { $unset: { 'distribuicaoPrevia.iniciadaEm': 1 } });

// Lembretes: convite que vence em até 1 dia; avaliação não concluída a 3 dias e a 1 dia do prazo.
// Cada lembrete é "reservado" no registro antes de enviar, pra nunca sair duas vezes.
module.exports.lembrar = async (mostra) => {
	let c = mostra.avaliacaoPrevia || {}, agora = Date.now(), enviados = 0, alvos = [];
	(await AvaliacaoPrevia.find({ feiraId: mostra._id, situacao: 'convidado', responderAte: { $lte: new Date(agora + DIA) }, lembretes: { $ne: 'convite' } }).lean())
		.forEach((a) => alvos.push({ a: a, chaves: ['convite'], tipo: 'lembrete-convite' }));
	if (c.prazoAvaliacao) {
		let falta = new Date(c.prazoAvaliacao).getTime() - agora;
		let chave = falta <= DIA ? 'prazo1' : (falta <= 3 * DIA ? 'prazo3' : null);
		if (chave && falta > 0) {
			(await AvaliacaoPrevia.find({ feiraId: mostra._id, situacao: 'aceito', lembretes: { $ne: chave } }).lean())
				.forEach((a) => alvos.push({ a: a, chaves: chave === 'prazo1' ? ['prazo1', 'prazo3'] : ['prazo3'], tipo: 'lembrete-prazo' }));
		}
	}
	for (let x of alvos) {
		let r = await AvaliacaoPrevia.updateOne({ _id: x.a._id, lembretes: { $ne: x.chaves[0] } }, { $addToSet: { lembretes: { $each: x.chaves } } });
		if (!r.modifiedCount) continue;
		let projeto = await Projeto.findById(x.a.projeto, 'nomeProjeto categoria eixo').lean();
		let pessoa = await Pessoa.findById(x.a.pessoa, 'nome email').lean();
		if (projeto && pessoa) { await avisar(x.tipo, x.a, mostra, projeto, pessoa); enviados++; }
	}
	return enviados;
};

// Rodada automática: Mostras com a etapa ativa e a distribuição ligada pela organização.
module.exports.ciclo = async () => {
	let mostras = await Feira.find({ tipo: 'edicao', 'avaliacaoPrevia.ativa': true, 'distribuicaoPrevia.iniciadaEm': { $exists: true } }).lean();
	for (let m of mostras) {
		try {
			await module.exports.distribuir(m._id);
			await module.exports.lembrar(m);
		} catch (e) {
			console.error('Erro na rodada automática da avaliação prévia (' + m.nome + ')', e);
		}
	}
};

module.exports.iniciarAgendador = () => {
	const rodar = () => module.exports.ciclo().catch((e) => console.error('Erro na rodada automática da avaliação prévia', e));
	setTimeout(rodar, 60 * 1000).unref();
	setInterval(rodar, 30 * 60 * 1000).unref();
};

// Resumo da Mostra pra tela do admin.
module.exports.resumo = async (mostra) => {
	let contagem = {};
	(await AvaliacaoPrevia.aggregate([{ $match: { feiraId: mostra._id } }, { $group: { _id: '$situacao', n: { $sum: 1 } } }]))
		.forEach((x) => { contagem[x._id] = x.n; });
	let d = mostra.distribuicaoPrevia || {};
	return { situacoes: contagem, iniciadaEm: d.iniciadaEm, ultimaEm: d.ultimaEm, faltando: d.faltando || [] };
};

// Usados também pelo acompanhamento (controllers/resultado-previa-controller.js).
module.exports.avisar = avisar;
module.exports.conflito = conflito;
module.exports.prioridade = prioridade;
module.exports.eixosComProjeto = eixosComProjeto;
module.exports.conflitoEixo = conflitoEixo;
module.exports.digitos = digitos;
