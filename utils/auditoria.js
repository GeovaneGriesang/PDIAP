'use strict';

// Auditoria: registra (models/auditoria-schema.js) toda alteração feita por alguém logado no admin
// (/admin) ou no Meu painel (/api/painel) - qualquer requisição que não é leitura. Grava depois que a
// resposta sai (res 'finish'), sem atrasar nem derrubar a requisição: erro aqui só vai pro log.

const Auditoria = require('../models/auditoria-schema');

// Descrição legível por rota (método + caminho, com ids trocados por :id). O que não está aqui
// aparece com o caminho mesmo.
const ACOES = {
	'POST /admin/administradores': 'Administradores: incluir', 'POST /admin/administradores/remover': 'Administradores: tirar',
	'PUT /admin/aprovarEscola': 'Escolas: aprovar', 'PUT /admin/rejeitarEscola': 'Escolas: rejeitar', 'PUT /admin/editarEscola': 'Escolas: editar',
	'POST /admin/criarEscola': 'Escolas: cadastrar', 'PUT /admin/removeEscola': 'Escolas: apagar',
	'PUT /admin/atualizaAvaliador': 'Avaliadores: editar', 'PUT /admin/removeAvaliador': 'Avaliadores: apagar', 'POST /admin/avaliador': 'Avaliadores: cadastrar',
	'PUT /admin/upgreiceAvaliadores': 'Avaliadores: presença', 'PUT /admin/avaliadores/previa': 'Avaliadores: aprovar para a prévia',
	'PUT /admin/atualizaEvento': 'Eventos: editar', 'POST /admin/criarEvento': 'Eventos: cadastrar', 'PUT /admin/removeEvento': 'Eventos: apagar',
	'PUT /admin/atualizaParticipante': 'Participantes: editar', 'POST /admin/criarParticipante': 'Participantes: cadastrar', 'PUT /admin/removeParticipante': 'Participantes: apagar',
	'PUT /admin/avaliacao-previa': 'Prévia: configuração', 'POST /admin/avaliacao-previa/distribuir': 'Prévia: distribuir', 'POST /admin/avaliacao-previa/pausar': 'Prévia: pausar distribuição',
	'POST /admin/avaliacao-previa/atribuir': 'Prévia: entregar trabalho', 'POST /admin/avaliacao-previa/remover': 'Prévia: tirar avaliador(a)',
	'POST /admin/avaliacao-previa/extra': 'Prévia: avaliador(a) a mais', 'POST /admin/avaliacao-previa/lembrar': 'Prévia: reenviar aviso',
	'PUT /admin/avaliacao-previa/criterios-resultado': 'Prévia: notas de corte', 'PUT /admin/avaliacao-previa/decisao': 'Prévia: decisão',
	'PUT /admin/avaliacao-final': 'Banca: configuração', 'POST /admin/avaliacao-final/distribuir': 'Banca: distribuir', 'POST /admin/avaliacao-final/atribuir': 'Banca: entregar trabalho',
	'POST /admin/avaliacao-final/remover': 'Banca: tirar avaliador(a)', 'POST /admin/avaliacao-final/avisar': 'Banca: avisar por e-mail',
	'POST /admin/avaliacao-final/lancar-papel': 'Banca: lançar ficha em papel', 'POST /admin/avaliacao-final/liberar-pendentes': 'Banca: não veio (liberar pendentes)',
	'POST /admin/avaliacao-final/reabrir': 'Banca: reabrir avaliação', 'POST /admin/avaliacao-final/recalcular': 'Banca: recalcular notas',
	'POST /admin/confirmarPremiados': 'Ranking: confirmar premiados', 'PUT /admin/setPremiadoProjetos': 'Projetos: premiação', 'PUT /admin/setPresencaProjetos': 'Projetos: presença',
	'POST /admin/criarFeira': 'Mostra/feira: cadastrar', 'PUT /admin/editarFeira': 'Mostra/feira: editar', 'PUT /admin/removeFeira': 'Mostra/feira: remover',
	'POST /admin/criarSeminario': 'Seminários: cadastrar', 'POST /admin/saberes': 'Saberes Docentes: cadastrar', 'POST /admin/registroSaberes': 'Saberes Docentes: cadastrar',
	'PUT /admin/documentos/:id/mostra': 'Documentos: trocar Mostra', 'POST /admin/postDocumento': 'Documentos: cadastrar', 'PUT /admin/putDocumento': 'Documentos: editar',
	'PUT /admin/putUpdateExibir': 'Documentos: exibir/esconder', 'POST /admin/postCertificado': 'Certificados: cadastrar', 'POST /admin/edit': 'Tela inicial do site: editar',
	'PUT /admin/mostraAtual': 'Mostra atual: trocar', 'POST /admin/setOpcoes': 'Campos editáveis: salvar',
	'POST /admin/enviarEmailAvaliadores': 'E-mails: avaliadores', 'POST /admin/enviarEmailParticipantes': 'E-mails: participantes',
	'POST /admin/enviarEmailPremiados': 'E-mails: premiados', 'POST /admin/enviarEmailProjetos': 'E-mails: projetos',
	'POST /admin/pessoas': 'Pessoas: cadastrar', 'PUT /admin/pessoas/:id': 'Pessoas: editar dados', 'POST /admin/pessoas/:id/email': 'Pessoas: trocar e-mail',
	'POST /admin/pessoas/mesclar': 'Pessoas: juntar cadastros',
	'PUT /admin/removeProjeto': 'Projetos: apagar', 'PUT /admin/removerIntegrante': 'Projetos: tirar integrante', 'PUT /admin/update': 'Projetos: editar',
	'PUT /admin/upgreice': 'Projetos: aprovação', 'PUT /admin/upgreiceEditProjeto': 'Projetos: editar',
	'PUT /api/painel/projetos/:id': 'Meu painel: editar projeto', 'PUT /api/painel/projetos/:id/integrantes': 'Meu painel: integrantes do projeto',
	'PUT /api/painel/projetos/:id/integrantes/remover': 'Meu painel: tirar integrante', 'POST /api/painel/projetos/:id/relatorio': 'Meu painel: enviar relatório',
	'POST /api/painel/projetos/:id/texto-previa': 'Meu painel: enviar texto da prévia',
	'POST /api/painel/avaliacoes-previas/:id/aceitar': 'Prévia: aceitar convite', 'POST /api/painel/avaliacoes-previas/:id/recusar': 'Prévia: recusar convite',
	'PUT /api/painel/avaliacoes-previas/:id': 'Prévia: salvar avaliação', 'PUT /api/painel/avaliacoes-finais/:id': 'Banca: salvar avaliação'
};

// Não registra: renovar/soltar a trava de edição (acontece sozinho a cada minuto).
const IGNORAR = /\/trava(\/(renovar|liberar))?$/;

const SENSIVEL = /senha|password|token|secret|xsrf|csrf/i;
const ID = /^[0-9a-f]{24}$/i;

// Corpo da requisição sem campos sensíveis, em texto curto.
function resumir(body) {
	if (!body || typeof body !== 'object') return undefined;
	let limpo = JSON.stringify(body, (k, v) => (k && SENSIVEL.test(k) ? '(oculto)' : v));
	if (!limpo || limpo === '{}') return undefined;
	return limpo.length > 2000 ? limpo.slice(0, 2000) + '…' : limpo;
}

// Nome do que foi alterado, se veio na requisição.
function alvoDe(body) {
	if (!body || typeof body !== 'object') return undefined;
	let b = body.projeto && typeof body.projeto === 'object' ? body.projeto : body;
	let partes = [];
	if (b.numInscricao) partes.push('nº ' + b.numInscricao);
	let nome = b.nomeProjeto || b.nome || b.titulo;
	if (typeof nome === 'string') partes.push(nome.slice(0, 200));
	return partes.length ? partes.join(' - ') : undefined;
}

function caminhoPadrao(url) {
	return url.split('?')[0].split('/').map((p) => (ID.test(p) ? ':id' : p)).join('/');
}

module.exports.registrar = (origem) => (req, res, next) => {
	if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
	res.on('finish', () => {
		try {
			let u = req.user;
			if (!u) return;
			let rota = caminhoPadrao(req.originalUrl || req.url);
			if (IGNORAR.test(rota)) return;
			let b = req.body || {};
			let feiraId = [b.mostraId, b.feiraId].find((x) => typeof x === 'string' && ID.test(x));
			Auditoria.create({
				pessoa: u._id, nome: u.nome || u.username, email: u.email, origem: origem, metodo: req.method, rota: rota,
				acao: ACOES[req.method + ' ' + rota], status: res.statusCode, feiraId: feiraId, alvo: alvoDe(b), detalhes: resumir(b),
				ip: req.ip
			}).catch((e) => console.error('Erro ao gravar auditoria', e));
		} catch (e) {
			console.error('Erro ao gravar auditoria', e);
		}
	});
	next();
};

// Lista pra tela (só super-admin): filtros por texto (nome, e-mail, ação, rota, alvo), período e
// "só alterações com erro"; 50 por página, mais recentes primeiro.
module.exports.listar = async (q) => {
	q = q || {};
	let filtro = {};
	let texto = String(q.texto || '').trim();
	if (texto) {
		let re = new RegExp(texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
		filtro.$or = [{ nome: re }, { email: re }, { acao: re }, { rota: re }, { alvo: re }];
	}
	let de = q.de ? new Date(q.de) : null, ate = q.ate ? new Date(q.ate) : null;
	if ((de && !isNaN(de)) || (ate && !isNaN(ate))) {
		filtro.quando = {};
		if (de && !isNaN(de)) filtro.quando.$gte = de;
		if (ate && !isNaN(ate)) filtro.quando.$lte = new Date(ate.getTime() + 24 * 60 * 60 * 1000 - 1);
	}
	if (q.feiraId && ID.test(q.feiraId)) filtro.feiraId = q.feiraId;
	if (q.erros === 'true') filtro.status = { $gte: 400 };
	let pagina = Math.max(0, parseInt(q.pagina, 10) || 0);
	let [total, itens] = await Promise.all([
		Auditoria.countDocuments(filtro),
		Auditoria.find(filtro).sort({ quando: -1 }).skip(pagina * 50).limit(50).lean()
	]);
	return { total: total, pagina: pagina, porPagina: 50, itens: itens };
};

module.exports.ACOES = ACOES;
module.exports.resumir = resumir;
module.exports.caminhoPadrao = caminhoPadrao;
