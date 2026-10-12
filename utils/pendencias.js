'use strict';

// Pendências do PRÓPRIO cadastro (Pessoa) que a pessoa precisa corrigir antes de usar o painel:
// enquanto houver alguma, ela não altera projeto, e-mails nem dados de avaliador(a) e não baixa
// certificado pelo painel (tela /painel/pendencias, ver routes/index.js#/conta/pendencias).
// Mesmo que falte só a nacionalidade.
//
// Problemas que a pessoa NÃO resolve sozinha (e-mail igual ao de outra Pessoa, etc.) ficam em
// Admin > Inconsistências > Cadastro, pra organização.

const documentoValidator = require('./documentoValidator')
,	sessao = require('./sessao');

const NACIONALIDADES = ['brasileiro', 'paraguaio', 'uruguaio', 'venezuelano', 'outro'];
module.exports.NACIONALIDADES = NACIONALIDADES;

function nomeCompleto(nome) {
	return (nome || '').trim().split(/\s+/).filter(Boolean).length >= 2;
}
module.exports.nomeCompleto = nomeCompleto;

// [{ campo, mensagem }] - vazio = cadastro em dia.
module.exports.daPessoa = (pessoa) => {
	if (!pessoa) return [];
	let lista = [];
	if (!nomeCompleto(pessoa.nome)) lista.push({ campo: 'nome', mensagem: 'Informe o seu nome completo (nome e sobrenome) - é o que sai nos certificados.' });
	if (!pessoa.documento) lista.push({ campo: 'documento', mensagem: 'O seu cadastro está sem documento de identificação.' });
	else if (!documentoValidator.validarDocumentoQualquerPais(pessoa.documento).valido) lista.push({ campo: 'documento', mensagem: 'O documento de identificação cadastrado (' + pessoa.documento + ') é inválido. Informe o correto.' });
	if (NACIONALIDADES.indexOf(pessoa.nacionalidade) === -1) lista.push({ campo: 'nacionalidade', mensagem: 'Informe a sua nacionalidade.' });
	return lista;
};

// Middleware: recusa a ação enquanto a Pessoa logada tiver pendência (conta legada sem Pessoa
// não tem como corrigir por aqui - passa).
module.exports.exigeSemPendencias = async (req, res, next) => {
	try {
		let pessoa = await sessao.pessoaDaSessao(req);
		if (pessoa && module.exports.daPessoa(pessoa).length) {
			return res.status(403).send('Antes de alterar qualquer coisa, corrija os dados do seu cadastro (Meu painel > Corrija seus dados).');
		}
		next();
	} catch (err) {
		console.error('Erro ao conferir pendências', err);
		res.sendStatus(500);
	}
};
