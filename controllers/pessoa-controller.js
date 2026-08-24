'use strict';

const Pessoa = require('../models/pessoa-schema');

// Busca uma Pessoa existente pelo documento (só dígitos); se não existir, cria uma nova.
// É o primitivo que toda rota de cadastro de papel (Avaliador, Participante, ...) usa em
// vez de criar um login isolado: se a pessoa já existe (porque já é avaliador, por
// exemplo) e se cadastra num segundo papel com o mesmo documento, reaproveita a Pessoa e
// o login dela sem mexer na senha - só o novo papel é criado por cima. O terceiro
// argumento do callback (`criada`) diz se a Pessoa é nova (útil pra decidir se deve
// avisar "sua senha inicial é o seu documento" ou "use sua senha de sempre").
module.exports.findOrCreatePessoa = (documento, dadosIniciais, callback) => {
	let doc = (documento || '').toString().replace(/\D+/g, '');
	Pessoa.findOne({ documento: doc }, (err, pessoa) => {
		if (err) return callback(err);
		if (pessoa) return callback(null, pessoa, false);

		let novaPessoa = new Pessoa({
			documento: doc,
			nome: dadosIniciais.nome,
			email: dadosIniciais.email,
			telefone: dadosIniciais.telefone,
			nacionalidade: dadosIniciais.nacionalidade,
			createdAt: Date.now()
		});
		novaPessoa.save((err, pessoaCriada) => {
			if (err) return callback(err);
			callback(null, pessoaCriada, true);
		});
	});
};

// Busca por e-mail - login é sempre pelo e-mail cadastrado (mesmo padrão que Avaliador/
// Participante já usavam).
module.exports.getLoginPessoa = (email, callback) => {
	Pessoa.findOne({ email: email }, callback);
};
