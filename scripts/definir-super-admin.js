'use strict';

// Marca (ou desmarca) uma Pessoa como Super-admin (acesso a tudo no admin, ver utils/perfil.js).
// O perfil nunca é dado por tela - só por este script, rodado por quem tem acesso ao servidor.
// A Pessoa é achada por qualquer um dos e-mails dela (principal ou alternativo).
//
// Uso:
//   node scripts/definir-super-admin.js --email fulano@exemplo.com --dry-run   (só mostra)
//   node scripts/definir-super-admin.js --email fulano@exemplo.com
//   node scripts/definir-super-admin.js --email fulano@exemplo.com --remover
//   node scripts/definir-super-admin.js --listar

require('dotenv').config(); // mesmo carregamento de .env que app.js faz
const mongoose = require('mongoose');
require('../configs/db-config'); // side effect: abre a conexão padrão (mongoose.connect)
const Pessoa = require('../models/pessoa-schema');
const pessoaController = require('../controllers/pessoa-controller');

const args = process.argv.slice(2);
const valor = (nome) => { let i = args.indexOf(nome); return i >= 0 ? args[i + 1] : undefined; };
const dryRun = args.includes('--dry-run');
const remover = args.includes('--remover');

(async () => {
	try {
		if (args.includes('--listar')) {
			let todos = await Pessoa.find({ superAdmin: true }, 'nome email emailsAlternativos').lean();
			console.log(todos.length ? todos.map((p) => '- ' + p.nome + ' <' + p.email + '>').join('\n') : 'Nenhum(a) super-admin.');
			return;
		}
		let email = valor('--email');
		if (!email) throw new Error('Informe --email (ou --listar).');
		let pessoas = await pessoaController.buscarPorEmail(email);
		if (pessoas.length !== 1) {
			throw new Error(pessoas.length ? 'Mais de uma Pessoa com esse e-mail - resolva o cadastro duplicado antes.' : 'Nenhuma Pessoa com esse e-mail.');
		}
		let p = pessoas[0];
		console.log((remover ? 'Desmarcar' : 'Marcar') + ' super-admin: ' + p.nome + ' <' + p.email + '>' +
			(p.emailsAlternativos && p.emailsAlternativos.length ? ' (+ ' + p.emailsAlternativos.join(', ') + ')' : '') +
			' - hoje: ' + (p.superAdmin ? 'super-admin' : 'não é super-admin') + '. Senha própria definida: ' + (p.senhaDefinida ? 'sim' : 'não'));
		if (dryRun) { console.log('(--dry-run: nada gravado)'); return; }
		await Pessoa.updateOne({ _id: p._id }, remover ? { $unset: { superAdmin: 1 } } : { $set: { superAdmin: true } });
		console.log('Gravado.');
	} catch (err) {
		console.error('Erro:', err.message);
		process.exitCode = 1;
	} finally {
		await mongoose.disconnect();
	}
})();
