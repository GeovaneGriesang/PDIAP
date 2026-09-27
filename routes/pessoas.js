'use strict';

const express = require('express')
, router = express.Router()
, rateLimit = require('express-rate-limit')
, PessoaSchema = require('../models/pessoa-schema')
, AvaliadorSchema = require('../models/avaliador-schema')
, ParticipanteSchema = require('../models/participante-schema')
, pessoaController = require('../controllers/pessoa-controller');

// Mesma razão de routes/index.js#authLimiter: aqui ainda mais sensível, porque a rota
// deixa alguém testar pares de documento+e-mail - sem limite, viraria oráculo de CPF.
const verificarLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 15,
	standardHeaders: true,
	legacyHeaders: false,
	message: { error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' }
});

// Cadastro público de avaliador (login único, ver controllers/pessoa-controller.js):
// detecta se o documento já pertence a uma Pessoa cadastrada, pra pré-preencher o
// formulário em vez de fazer a pessoa digitar tudo de novo. Só devolve dados quando o
// e-mail informado bate com o da Pessoa (ou com o de algum papel já vinculado a ela) -
// exatamente a mesma regra que vincularPessoa já usa pra decidir se reaproveita a
// Pessoa - senão, qualquer um que soubesse um CPF conseguiria puxar nome/telefone de
// outra pessoa. Documento não encontrado e documento encontrado com e-mail diferente
// devolvem a mesma resposta, pra não revelar por fora se aquele CPF já existe.
router.post('/verificar', verificarLimiter, async (req, res) => {
	try {
		let documento = (req.body.documento || '').toString().replace(/\D+/g, '');
		if (!documento) return res.send({ encontrado: false });

		let pessoa = await PessoaSchema.findOne({ documento: documento });
		if (!pessoa) return res.send({ encontrado: false });

		if (pessoaController.mesmoEmail(pessoa.email, req.body.email)) {
			return res.send({ encontrado: true, nome: pessoa.nome, telefone: pessoa.telefone, nacionalidade: pessoa.nacionalidade });
		}

		let [avaliadores, participantes] = await Promise.all([
			AvaliadorSchema.find({ pessoa: pessoa._id }, 'email'),
			ParticipanteSchema.find({ pessoa: pessoa._id }, 'email')
		]);
		let bate = [...avaliadores, ...participantes].some((r) => pessoaController.mesmoEmail(r.email, req.body.email));
		if (bate) return res.send({ encontrado: true, nome: pessoa.nome, telefone: pessoa.telefone, nacionalidade: pessoa.nacionalidade });

		res.send({ encontrado: false });
	} catch (err) {
		console.error('Erro ao verificar Pessoa existente', err);
		res.status(500).send({ encontrado: false });
	}
});

module.exports = router;
