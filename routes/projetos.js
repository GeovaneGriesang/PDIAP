'use strict';

// O login PRÓPRIO do projeto acabou: dados, integrantes e relatório agora são alterados pelos
// integrantes no "Meu painel" (routes/painel-projetos.js, com trava de edição). Aqui sobra só
// o link antigo de confirmação de participação (tela "confirmando" do app do admin), que passa
// a exigir que quem está logado(a) seja integrante do projeto.

const express = require('express')
, router = express.Router()
, ProjetoSchema = require('../models/projeto-schema')
, sessao = require('../utils/sessao')
, pendencias = require('../utils/pendencias');

function idValido(id) {
  return typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
}

// 2456 = participa, 9877 = não participa. Só vale uma vez (participa_updated), e só pra
// projeto aprovado - mesma regra de antes.
router.post('/confirma/:id/:situacao', async (req, res) => {
  try {
    if (!req.isAuthenticated() || !sessao.ehPessoa(req.user)) return res.sendStatus(403);
    if (!idValido(req.params.id)) return res.status(400).send('ID inválido.');
    if (pendencias.daPessoa(req.user).length) return res.status(403).send('Antes, corrija os dados do seu cadastro (Meu painel > Corrija seus dados).');
    let situacao = { '2456': true, '9877': false }[req.params.situacao];
    if (situacao === undefined) return res.status(400).send('Situação inválida.');
    let ehDela = [{ pessoa: req.user._id }];
    let doc = (req.user.documento || '').replace(/[^0-9A-Za-z]/g, '');
    if (doc) ehDela.push({ cpf: new RegExp('^' + doc + '$', 'i') });
    let docs = await ProjetoSchema.findOneAndUpdate(
      { _id: req.params.id, aprovado: true, participa_updated: { $exists: false },
        integrantes: { $elemMatch: { $or: ehDela } } },
      { $set: { participa: situacao, participa_updated: true } },
      { returnDocument: 'after' }
    );
    if (!docs) return res.sendStatus(401);
    res.send(docs.nomeProjeto);
  } catch (err) {
    console.error('Erro ao confirmar participação', err);
    res.status(500).send('error');
  }
});

module.exports = router;
