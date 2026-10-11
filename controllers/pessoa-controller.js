'use strict';

const Pessoa = require('../models/pessoa-schema')
,	Avaliador = require('../models/avaliador-schema')
,	Participante = require('../models/participante-schema');

// Busca uma Pessoa existente pelo documento (só dígitos); se não existir, cria uma nova.
// É o primitivo que toda rota de cadastro de papel (Avaliador, Participante, ...) usa em
// vez de criar um login isolado: se a pessoa já existe (porque já é avaliador, por
// exemplo) e se cadastra num segundo papel com o mesmo documento, reaproveita a Pessoa e
// o login dela sem mexer na senha - só o novo papel é criado por cima. O terceiro
// argumento do callback (`criada`) diz se a Pessoa é nova (útil pra decidir se deve
// avisar "sua senha inicial é o seu documento" ou "use sua senha de sempre").
module.exports.findOrCreatePessoa = async (documento, dadosIniciais, callback) => {
	let doc = (documento || '').toString().replace(/[^0-9A-Za-z]/g, '').toUpperCase();
	try {
		let pessoa = await Pessoa.findOne({ documento: doc });
		if (pessoa) return callback(null, pessoa, false);

		let novaPessoa = new Pessoa({
			documento: doc,
			nome: dadosIniciais.nome,
			email: dadosIniciais.email,
			telefone: dadosIniciais.telefone,
			nacionalidade: dadosIniciais.nacionalidade,
			createdAt: Date.now()
		});
		let pessoaCriada = await novaPessoa.save();
		callback(null, pessoaCriada, true);
	} catch (err) {
		callback(err);
	}
};

function mesmoEmail(a, b) {
	let x = (a || '').trim().toLowerCase(), y = (b || '').trim().toLowerCase();
	return x.length > 0 && x === y;
}
module.exports.mesmoEmail = mesmoEmail;

// --- E-mails da Pessoa: principal + até 2 alternativos, login por qualquer um ----------
const MAX_EMAILS = 3;
module.exports.MAX_EMAILS = MAX_EMAILS;

function regexEmailExato(email) {
	let escapado = (email || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	return new RegExp('^' + escapado + '$', 'i');
}
module.exports.regexEmailExato = regexEmailExato;

// Filtro Mongo: Pessoa que tem este e-mail como principal OU alternativo (sem diferenciar
// maiúscula/minúscula).
function filtroEmail(email) {
	let re = regexEmailExato(email);
	return { $or: [{ email: re }, { emailsAlternativos: re }] };
}
module.exports.filtroEmail = filtroEmail;

// Todos os e-mails de acesso da Pessoa (principal primeiro).
function emailsDa(pessoa) {
	if (!pessoa) return [];
	return [pessoa.email].concat(pessoa.emailsAlternativos || []).filter((e) => e && e.trim());
}
module.exports.emailsDa = emailsDa;

module.exports.pessoaTemEmail = (pessoa, email) => emailsDa(pessoa).some((e) => mesmoEmail(e, email));

// Pessoas com este e-mail (principal ou alternativo). Normalmente 0 ou 1; mais de 1 só nos
// cadastros duplicados antigos - o login tenta a senha em cada uma (ver loginBootstrap).
module.exports.buscarPorEmail = (email) => {
	if (!email || !email.trim()) return Promise.resolve([]);
	return Pessoa.find(filtroEmail(email));
};

// Decide a qual Pessoa um papel NOVO (Avaliador/Participante) deve ser vinculado, pelo
// documento. Devolve o _id da Pessoa ou undefined (papel fica sem vínculo, com senha própria
// como antes). Nunca lança: falha aqui não pode impedir o cadastro.
//
// Regra de segurança: pessoa nova é sempre vinculada; Pessoa que já existia só é reaproveitada
// se o e-mail informado bater com o dela ou com o de um papel já vinculado a ela. Sem isso,
// como a inscrição é pública e CPF não é segredo, alguém poderia cadastrar o CPF de outra
// pessoa com um e-mail próprio, pedir "esqueci a senha" e trocar a senha compartilhada dela.
module.exports.vincularPessoa = async (dados) => {
	try {
		let documento = (dados.cpf || '').toString().replace(/[^0-9A-Za-z]/g, '').toUpperCase();
		if (!documento) return undefined;

		// Documento novo com um e-mail que já é login de OUTRA Pessoa: não cria (duas Pessoas com
		// o mesmo e-mail quebrariam o login, que é pelo e-mail). Comum em inscrição de projeto,
		// onde estudante às vezes usa o e-mail do(a) orientador(a).
		let email = (dados.email || '').trim();
		if (email && !(await Pessoa.findOne({ documento: documento }, '_id'))) {
			if (await Pessoa.findOne(filtroEmail(email), '_id')) {
				console.warn('Documento novo com e-mail de outra Pessoa - papel fica sem vínculo.');
				return undefined;
			}
		}

		let resultado = await new Promise((resolve, reject) => {
			module.exports.findOrCreatePessoa(documento, dados, (err, pessoa, criada) => err ? reject(err) : resolve({ pessoa, criada }));
		});
		if (resultado.criada || module.exports.pessoaTemEmail(resultado.pessoa, dados.email)) return resultado.pessoa._id;

		let [avaliadores, participantes] = await Promise.all([
			Avaliador.find({ pessoa: resultado.pessoa._id }, 'email'),
			Participante.find({ pessoa: resultado.pessoa._id }, 'email')
		]);
		if ([...avaliadores, ...participantes].some((r) => mesmoEmail(r.email, dados.email))) return resultado.pessoa._id;

		console.warn('Cadastro com documento já existente mas e-mail diferente - papel fica sem vínculo com a Pessoa (senha própria).');
		return undefined;
	} catch (err) {
		console.error('Erro ao vincular papel à Pessoa', err);
		return undefined;
	}
};

// Resolve uma Pessoa pro admin que informa alguém num formulário (ex: responsável de evento):
// documento já cadastrado => reaproveita a Pessoa (nome/e-mail do cadastro prevalecem, nada é
// sobrescrito); senão cria uma nova, exigindo nome completo, documento válido e e-mail (o mínimo
// pra emitir certificado e permitir login). Perfil/papel nunca é gravado na Pessoa - é derivado
// dos vínculos de cada Mostra. Devolve { pessoa } ou { erro } (mensagem pronta pro usuário).
module.exports.resolverPessoaAdmin = async (dados, documentoValidator) => {
	let checagemDoc = documentoValidator.validarDocumentoQualquerPais(dados.cpf);
	if (!checagemDoc.valido) return { erro: checagemDoc.mensagem };
	let documento = checagemDoc.normalizado;

	let existente = await Pessoa.findOne({ documento: documento });
	if (existente) return { pessoa: existente };

	let nome = (dados.nome || '').trim();
	let email = (dados.email || '').trim().toLowerCase();
	if (nome.length < 2) return { erro: 'Informe o nome completo da pessoa (doc. ' + documento + ').' };
	if (!/^.+@.+\..+$/.test(email)) return { erro: 'Informe um e-mail válido para ' + nome + ' (necessário para certificado e login).' };

	// Login é pelo e-mail: dois cadastros com o mesmo e-mail e documentos diferentes quebrariam o login.
	if (await Pessoa.findOne(filtroEmail(email), '_id')) return { erro: 'O e-mail ' + email + ' já pertence a outra pessoa cadastrada com outro documento.' };

	let pessoa = await new Pessoa({ documento: documento, nome: nome, email: email }).save();
	return { pessoa };
};

// E-mail livre pra ser usado pela Pessoa `pessoaId` (como principal ou alternativo): não pode
// ser e-mail de outra Pessoa nem de um Avaliador/Participante sem vínculo com ela (esse e-mail
// ainda é login de conta legada).
module.exports.emailLivre = async (email, pessoaId) => {
	let re = regexEmailExato(email);
	if (await Pessoa.findOne(Object.assign(filtroEmail(email), { _id: { $ne: pessoaId } }), '_id')) return false;
	let filtroPapel = { email: re, pessoa: { $ne: pessoaId } };
	if (await Avaliador.findOne(filtroPapel, '_id')) return false;
	if (await Participante.findOne(filtroPapel, '_id')) return false;
	return true;
};
