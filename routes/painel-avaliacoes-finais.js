'use strict';

// Avaliação FINAL (no evento) no "Meu painel" de quem avalia (montado em /api/painel/avaliacoes-finais,
// ver app.js): trabalhos recebidos pela distribuição (controllers/avaliacao-final-controller.js) e a
// ficha. Ao concluir, a nota vai sozinha pro ranking (#publicar). Cada pessoa só enxerga os próprios
// registros (AvaliacaoFinal.pessoa).

const express = require('express')
, router = express.Router()
, fs = require('fs')
, AvaliacaoFinal = require('../models/avaliacao-final-schema')
, Feira = require('../models/feira-schema')
, ProjetoSchema = require('../models/projeto-schema')
, sessao = require('../utils/sessao')
, pendencias = require('../utils/pendencias')
, configPrevia = require('../controllers/avaliacao-previa-controller')
, relatorioProjeto = require('../utils/relatorioProjeto')
, final = require('../controllers/avaliacao-final-controller');

function idValido(id) {
  return typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
}

function exigePessoa(req, res, next) {
  if (!req.isAuthenticated() || !sessao.ehPessoa(req.user)) return res.sendStatus(403);
  next();
}

const CAMPOS_PROJETO = 'nomeProjeto numInscricao categoria eixo resumo palavraChave nomeEscola cidade estado integrantes textoPrevia relatorio2';

// Registro `req.params.id` DESTA pessoa (ainda com ela), com a Mostra e o trabalho.
async function carregar(req, res, next) {
  try {
    if (!idValido(req.params.id)) return res.status(400).send('ID inválido.');
    let atr = await AvaliacaoFinal.findOne({ _id: req.params.id, pessoa: req.user._id });
    if (!atr) return res.status(404).send('Trabalho não encontrado entre os seus.');
    if (!final.ATIVAS.includes(atr.situacao)) return res.status(410).send('Este trabalho não está mais com você.');
    req.atr = atr;
    req.mostra = await Feira.findById(atr.feiraId, final.CAMPOS_MOSTRA).lean();
    req.projeto = await ProjetoSchema.findById(atr.projeto, CAMPOS_PROJETO).lean();
    if (!req.mostra || !req.projeto) return res.status(404).send('Trabalho não encontrado.');
    next();
  } catch (err) {
    console.error('Erro ao carregar avaliação final', err);
    res.status(500).send('Erro ao carregar o trabalho.');
  }
}

router.use(exigePessoa);

// Trabalhos recebidos (ainda com a pessoa) das Mostras com a avaliação no evento ativa.
router.get('/', async (req, res) => {
  try {
    let lista = await AvaliacaoFinal.find({ pessoa: req.user._id, situacao: { $in: final.ATIVAS } }).lean();
    let mostras = new Map((await Feira.find({ _id: { $in: lista.map((a) => a.feiraId) }, 'avaliacaoFinal.ativa': true }, 'nome ano avaliacaoFinal').lean()).map((m) => [String(m._id), m]));
    let projetos = new Map((await ProjetoSchema.find({ _id: { $in: lista.map((a) => a.projeto) } }, 'nomeProjeto numInscricao categoria eixo nomeEscola').lean()).map((p) => [String(p._id), p]));
    res.send(lista.filter((a) => mostras.has(String(a.feiraId))).map((a) => {
      let m = mostras.get(String(a.feiraId)), p = projetos.get(String(a.projeto)) || {};
      let ab = final.aberta(m);
      return {
        _id: a._id, situacao: a.situacao, total: a.total, maximo: a.maximo, concluidoEm: a.concluidoEm, rascunho: !!a.salvoEm && a.situacao === 'pendente',
        mostra: { _id: m._id, nome: m.nome, ano: m.ano }, aberta: ab.aberta, motivo: ab.motivo,
        projeto: { numInscricao: p.numInscricao, nomeProjeto: p.nomeProjeto, categoria: p.categoria, eixo: p.eixo, nomeEscola: p.nomeEscola }
      };
    }).sort((x, y) => (x.projeto.numInscricao || 0) - (y.projeto.numInscricao || 0)));
  } catch (err) {
    console.error('Erro ao listar avaliações finais', err);
    res.status(500).send('Erro ao listar os trabalhos.');
  }
});

// Trabalho + ficha. No evento a pessoa está diante do trabalho: não é anônima.
router.get('/:id', carregar, async (req, res) => {
  try {
    let atr = req.atr, p = req.projeto, c = req.mostra.avaliacaoFinal || {};
    if (!c.ativa) return res.status(403).send('A avaliação no evento desta Mostra está desligada.');
    let f = await final.fichaDoRegistro(req.mostra, atr, p);
    let temEscrita = f.ficha.some((k) => k.parte === 'escrita');
    let ab = final.aberta(req.mostra);
    res.send({
      _id: atr._id, situacao: atr.situacao, mostra: { nome: req.mostra.nome, ano: req.mostra.ano },
      abreEm: c.abreEm, fechaEm: c.fechaEm, aberta: ab.aberta, motivo: ab.motivo, instrucoes: c.instrucoesAvaliador || '',
      projeto: {
        numInscricao: p.numInscricao, nomeProjeto: p.nomeProjeto, categoria: p.categoria, eixo: p.eixo, resumo: p.resumo, palavraChave: p.palavraChave,
        nomeEscola: p.nomeEscola, cidade: p.cidade, estado: p.estado, integrantes: (p.integrantes || []).map((i) => ({ nome: i.nome, tipo: i.tipo })),
        // Material pra avaliar a parte escrita no evento (quando ela não veio da prévia).
        temTexto: temEscrita && !!p.textoPrevia,
        temRelatorio: temEscrita && !p.textoPrevia && relatorioProjeto.existe(p)
      },
      ficha: f.ficha, escritaDaPrevia: f.escritaDaPrevia,
      notas: atr.notas || [], parecer: atr.parecer || '', total: atr.total, maximo: atr.maximo, concluidoEm: atr.concluidoEm, salvoEm: atr.salvoEm
    });
  } catch (err) {
    console.error('Erro ao abrir avaliação final', err);
    res.status(500).send('Erro ao abrir o trabalho.');
  }
});

// Texto enviado na etapa prévia (quando a parte escrita é avaliada no evento).
router.get('/:id/texto', carregar, async (req, res) => {
  try {
    let arquivo = configPrevia.arquivoDoProjeto(req.projeto._id);
    if (!req.projeto.textoPrevia || !fs.existsSync(arquivo)) return res.status(404).send('Texto não encontrado.');
    res.download(arquivo, 'trabalho-' + (req.projeto.numInscricao || String(req.atr._id).slice(-6)) + '.pdf');
  } catch (err) {
    console.error('Erro ao baixar texto (avaliação final)', err);
    res.status(500).send('Erro ao baixar o texto.');
  }
});

// Relatório enviado pelo projeto (material da parte escrita quando não há texto da prévia).
router.get('/:id/relatorio', carregar, (req, res) => {
  if (!relatorioProjeto.existe(req.projeto)) return res.status(404).send('Relatório não encontrado.');
  res.download(relatorioProjeto.arquivoDoProjeto(req.projeto._id), relatorioProjeto.nomeParaDownload(req.projeto));
});

// Notas pela ficha. concluir=false guarda o rascunho (pode faltar nota); concluir=true exige todas,
// calcula o total e manda pro ranking. Dá pra alterar enquanto a avaliação estiver aberta.
router.put('/:id', carregar, pendencias.exigeSemPendencias, async (req, res) => {
  try {
    let atr = req.atr;
    let ab = final.aberta(req.mostra);
    if (!ab.aberta) return res.status(403).send(ab.motivo);
    let f = await final.fichaDoRegistro(req.mostra, atr, req.projeto);
    let ficha = f.ficha;
    let recebidas = Array.isArray(req.body && req.body.notas) ? req.body.notas : [];
    if (recebidas.length !== ficha.length) return res.status(409).send('A ficha deste trabalho mudou. Recarregue a página e confira as notas.');
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
      ficha: ficha, escritaDaPrevia: f.escritaDaPrevia, notas: notas, parecer: String((req.body && req.body.parecer) || '').slice(0, 5000), salvoEm: new Date(),
      maximo: ficha.reduce((s, k) => s + k.maximo, 0), situacao: concluir ? 'concluido' : 'pendente'
    };
    let unset = {};
    if (completa) set.total = Math.round(notas.reduce((s, n) => s + n, 0) * 100) / 100; else unset.total = 1;
    if (concluir) set.concluidoEm = atr.concluidoEm || new Date(); else unset.concluidoEm = 1;
    let r = await AvaliacaoFinal.updateOne({ _id: atr._id, situacao: { $in: final.ATIVAS } }, Object.keys(unset).length ? { $set: set, $unset: unset } : { $set: set });
    if (!r.matchedCount) return res.status(409).send('Este trabalho mudou de situação. Recarregue a página.');
    // Concluída agora, alterada depois de concluída ou voltou a rascunho: o ranking acompanha.
    if (concluir || atr.situacao === 'concluido') await final.publicar(atr.projeto);
    res.send({ total: set.total, maximo: set.maximo, situacao: set.situacao });
  } catch (err) {
    console.error('Erro ao salvar avaliação final', err);
    res.status(500).send('Erro ao salvar a avaliação.');
  }
});

module.exports = router;
