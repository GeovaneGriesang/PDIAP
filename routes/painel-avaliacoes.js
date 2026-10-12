'use strict';

// Avaliação PRÉVIA no "Meu painel" de quem avalia (montado em /api/painel/avaliacoes-previas, ver
// app.js): trabalhos recebidos pela distribuição (controllers/distribuicao-previa-controller.js),
// aceite/recusa do convite, texto do trabalho e a ficha com as notas. Cada pessoa só enxerga os
// próprios registros (AvaliacaoPrevia.pessoa).

const express = require('express')
, router = express.Router()
, fs = require('fs')
, AvaliacaoPrevia = require('../models/avaliacao-previa-schema')
, Feira = require('../models/feira-schema')
, ProjetoSchema = require('../models/projeto-schema')
, sessao = require('../utils/sessao')
, pendencias = require('../utils/pendencias')
, config = require('../controllers/avaliacao-previa-controller')
, distribuicao = require('../controllers/distribuicao-previa-controller');

function idValido(id) {
  return typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
}

function exigePessoa(req, res, next) {
  if (!req.isAuthenticated() || !sessao.ehPessoa(req.user)) return res.sendStatus(403);
  next();
}

// Registro `req.params.id` DESTA pessoa, com a Mostra. Convite vencido vira 'expirado' aqui mesmo.
async function carregar(req, res, next) {
  try {
    if (!idValido(req.params.id)) return res.status(400).send('ID inválido.');
    let atr = await AvaliacaoPrevia.findOne({ _id: req.params.id, pessoa: req.user._id });
    if (!atr) return res.status(404).send('Trabalho não encontrado entre os seus.');
    if (atr.situacao === 'convidado' && atr.responderAte && atr.responderAte < new Date()) {
      atr.situacao = 'expirado';
      atr.respondidoEm = new Date();
      await atr.save();
    }
    req.atr = atr;
    req.mostra = await Feira.findById(atr.feiraId, 'nome ano avaliacaoPrevia distribuicaoPrevia').lean();
    next();
  } catch (err) {
    console.error('Erro ao carregar avaliação prévia', err);
    res.status(500).send('Erro ao carregar o trabalho.');
  }
}

// Recusa/vaga liberada: completa o trabalho com outra pessoa (se a organização ligou a distribuição).
function substituir(mostra) {
  if (!(mostra && mostra.distribuicaoPrevia && mostra.distribuicaoPrevia.iniciadaEm)) return;
  distribuicao.distribuir(mostra._id).catch((e) => console.error('Erro ao substituir avaliador(a) da etapa prévia', e));
}

router.use(exigePessoa);

// Lista dos trabalhos recebidos (ativos) de todas as Mostras.
router.get('/', async (req, res) => {
  try {
    await distribuicao.expirarConvites();
    let lista = await AvaliacaoPrevia.find({ pessoa: req.user._id, situacao: { $in: distribuicao.ATIVAS } }).sort({ criadoEm: -1 }).lean();
    let mostras = new Map((await Feira.find({ _id: { $in: lista.map((a) => a.feiraId) } }, 'nome ano avaliacaoPrevia').lean()).map((m) => [String(m._id), m]));
    let projetos = new Map((await ProjetoSchema.find({ _id: { $in: lista.map((a) => a.projeto) } }, 'nomeProjeto categoria eixo').lean()).map((p) => [String(p._id), p]));
    res.send(lista.map((a) => {
      let m = mostras.get(String(a.feiraId)) || {}, p = projetos.get(String(a.projeto)) || {};
      let ab = distribuicao.avaliacaoAberta(m);
      return {
        _id: a._id, situacao: a.situacao, responderAte: a.responderAte, total: a.total, maximo: a.maximo, concluidoEm: a.concluidoEm,
        mostra: { nome: m.nome, ano: m.ano }, prazoAvaliacao: (m.avaliacaoPrevia || {}).prazoAvaliacao, aberta: ab.aberta,
        projeto: { nomeProjeto: p.nomeProjeto, categoria: p.categoria, eixo: p.eixo }
      };
    }).filter((a) => a.aberta || a.situacao === 'concluido'));
  } catch (err) {
    console.error('Erro ao listar avaliações prévias', err);
    res.status(500).send('Erro ao listar os trabalhos.');
  }
});

// Trabalho + ficha. Na avaliação anônima, sem integrantes nem escola.
router.get('/:id', carregar, async (req, res) => {
  try {
    let atr = req.atr, c = req.mostra.avaliacaoPrevia || {};
    if (!distribuicao.ATIVAS.includes(atr.situacao)) return res.status(410).send(atr.situacao === 'expirado' ? 'O prazo para aceitar este convite terminou.' : 'Este trabalho não está mais com você.');
    let p = await ProjetoSchema.findById(atr.projeto, 'nomeProjeto numInscricao categoria eixo resumo palavraChave nomeEscola cidade estado integrantes textoPrevia').lean();
    if (!p) return res.status(404).send('Trabalho não encontrado.');
    let anonima = c.anonima !== false;
    let projeto = { nomeProjeto: p.nomeProjeto, categoria: p.categoria, eixo: p.eixo, resumo: p.resumo, palavraChave: p.palavraChave, temTexto: !!p.textoPrevia };
    if (!anonima) {
      projeto.nomeEscola = p.nomeEscola;
      projeto.cidade = p.cidade;
      projeto.estado = p.estado;
      projeto.integrantes = (p.integrantes || []).map((i) => ({ nome: i.nome, tipo: i.tipo }));
    }
    let ab = distribuicao.avaliacaoAberta(req.mostra);
    res.send({
      _id: atr._id, situacao: atr.situacao, responderAte: atr.responderAte,
      mostra: { nome: req.mostra.nome, ano: req.mostra.ano }, prazoAvaliacao: c.prazoAvaliacao, anonima: anonima,
      instrucoes: c.instrucoesAvaliador || '', aberta: ab.aberta, motivo: ab.motivo, projeto: projeto,
      ficha: atr.ficha && atr.ficha.length ? atr.ficha : distribuicao.fichaDaCategoria(req.mostra, p.categoria),
      notas: atr.notas || [], parecer: atr.parecer || '', total: atr.total, maximo: atr.maximo, concluidoEm: atr.concluidoEm, salvoEm: atr.salvoEm
    });
  } catch (err) {
    console.error('Erro ao abrir avaliação prévia', err);
    res.status(500).send('Erro ao abrir o trabalho.');
  }
});

// Texto do trabalho: só depois de aceitar.
router.get('/:id/texto', carregar, async (req, res) => {
  try {
    if (!['aceito', 'concluido'].includes(req.atr.situacao)) return res.status(403).send('Aceite o convite para ver o texto.');
    let p = await ProjetoSchema.findById(req.atr.projeto, 'textoPrevia').lean();
    let arquivo = config.arquivoDoProjeto(req.atr.projeto);
    if (!p || !p.textoPrevia || !fs.existsSync(arquivo)) return res.status(404).send('Texto não encontrado.');
    // Nome neutro: o nome original do arquivo pode identificar a escola ou os(as) integrantes.
    res.download(arquivo, 'trabalho-' + String(req.atr._id).slice(-6) + '.pdf');
  } catch (err) {
    console.error('Erro ao baixar texto (avaliador)', err);
    res.status(500).send('Erro ao baixar o texto.');
  }
});

router.post('/:id/aceitar', carregar, pendencias.exigeSemPendencias, async (req, res) => {
  try {
    let atr = req.atr;
    if (atr.situacao === 'expirado') return res.status(410).send('O prazo para aceitar este convite terminou.');
    if (atr.situacao !== 'convidado') return res.status(409).send('Este convite já foi respondido.');
    if (!(req.mostra.avaliacaoPrevia || {}).ativa) return res.status(403).send('A etapa prévia desta Mostra está desligada.');
    let r = await AvaliacaoPrevia.updateOne({ _id: atr._id, situacao: 'convidado' }, { $set: { situacao: 'aceito', respondidoEm: new Date() } });
    if (!r.modifiedCount) return res.status(409).send('Este convite já foi respondido.');
    res.send('success');
  } catch (err) {
    console.error('Erro ao aceitar avaliação prévia', err);
    res.status(500).send('Erro ao aceitar.');
  }
});

// Recusa o convite - ou devolve um trabalho recebido direto, se ainda não começou a avaliar.
router.post('/:id/recusar', carregar, pendencias.exigeSemPendencias, async (req, res) => {
  try {
    let atr = req.atr;
    let podeDevolver = atr.situacao === 'convidado' || (atr.situacao === 'aceito' && !(atr.notas || []).some((n) => n !== null && n !== undefined));
    if (!podeDevolver) return res.status(409).send(atr.situacao === 'expirado' ? 'O prazo para responder este convite terminou.' : 'Este trabalho já está em avaliação e não pode mais ser devolvido. Fale com a organização.');
    let motivo = String((req.body && req.body.motivo) || '').slice(0, 1000);
    let r = await AvaliacaoPrevia.updateOne({ _id: atr._id, situacao: atr.situacao }, { $set: { situacao: 'recusado', respondidoEm: new Date(), motivoRecusa: motivo } });
    if (!r.modifiedCount) return res.status(409).send('Este trabalho mudou de situação. Recarregue a página.');
    res.send('success');
    substituir(req.mostra);
  } catch (err) {
    console.error('Erro ao recusar avaliação prévia', err);
    res.status(500).send('Erro ao recusar.');
  }
});

// Notas pela ficha. concluir=false guarda o rascunho (pode faltar nota); concluir=true exige todas
// e calcula o total. Dá pra alterar até o prazo da avaliação.
router.put('/:id', carregar, pendencias.exigeSemPendencias, async (req, res) => {
  try {
    let atr = req.atr;
    if (!['aceito', 'concluido'].includes(atr.situacao)) return res.status(403).send(atr.situacao === 'convidado' ? 'Aceite o convite antes de avaliar.' : 'Este trabalho não está mais com você.');
    let ab = distribuicao.avaliacaoAberta(req.mostra);
    if (!ab.aberta) return res.status(403).send(ab.motivo);
    let ficha = atr.ficha && atr.ficha.length ? atr.ficha.map((k) => ({ nome: k.nome, maximo: k.maximo })) : null;
    if (!ficha) {
      let p = await ProjetoSchema.findById(atr.projeto, 'categoria').lean();
      ficha = distribuicao.fichaDaCategoria(req.mostra, p && p.categoria);
    }
    let recebidas = Array.isArray(req.body && req.body.notas) ? req.body.notas : [];
    let notas = [];
    for (let i = 0; i < ficha.length; i++) {
      let v = recebidas[i];
      if (v === null || v === undefined || v === '') { notas.push(null); continue; }
      let n = Number(v);
      if (!isFinite(n) || n < 0 || n > ficha[i].maximo) return res.status(400).send('A nota de "' + ficha[i].nome + '" precisa estar entre 0 e ' + ficha[i].maximo + '.');
      notas.push(Math.round(n * 100) / 100);
    }
    let concluir = req.body && req.body.concluir === true;
    let completa = notas.every((n) => n !== null);
    if (concluir && !completa) return res.status(400).send('Para concluir, dê nota a todos os critérios da ficha.');
    let set = {
      ficha: ficha, notas: notas, parecer: String((req.body && req.body.parecer) || '').slice(0, 5000), salvoEm: new Date(),
      maximo: ficha.reduce((s, k) => s + k.maximo, 0),
      situacao: concluir ? 'concluido' : 'aceito'
    };
    let unset = {};
    if (completa) set.total = Math.round(notas.reduce((s, n) => s + n, 0) * 100) / 100; else unset.total = 1;
    if (concluir) set.concluidoEm = new Date(); else unset.concluidoEm = 1;
    let r = await AvaliacaoPrevia.updateOne({ _id: atr._id, situacao: { $in: ['aceito', 'concluido'] } }, Object.keys(unset).length ? { $set: set, $unset: unset } : { $set: set });
    if (!r.matchedCount) return res.status(409).send('Este trabalho mudou de situação. Recarregue a página.');
    res.send({ total: set.total, maximo: set.maximo, situacao: set.situacao });
  } catch (err) {
    console.error('Erro ao salvar avaliação prévia', err);
    res.status(500).send('Erro ao salvar a avaliação.');
  }
});

module.exports = router;
