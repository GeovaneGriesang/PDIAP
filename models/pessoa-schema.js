'use strict';

const mongoose = require('mongoose')
,	Schema = mongoose.Schema;

// Pessoa é a identidade central do sistema (frente "login único" - ver memória
// project-frente7-login-unico): dona exclusiva do login (email/senha) e dos dados
// de identidade (documento, nome, telefone, nacionalidade). Avaliador/Participante
// deixam de ter senha própria e passam a só referenciar uma Pessoa (campo `pessoa`).
// Isso permite que a mesma pessoa acumule vários papéis sem duplicar cadastro/senha:
// ao se cadastrar num segundo papel com o mesmo documento, reaproveita a Pessoa e o
// login já existentes (ver controllers/pessoa-controller.js#findOrCreatePessoa).
const PessoaSchema = new Schema({
	// Só dígitos, sem formatação - único em todo o sistema (é a chave que identifica
	// a mesma pessoa entre papéis diferentes).
	documento: { type: String, unique: true, required: true },
	nome: { type: String },
	// E-mail principal (avisos e certificados vão pra ele) + até 2 alternativos: a pessoa entra
	// por qualquer um dos 3. Nenhum deles pode ser e-mail (principal ou alternativo) de outra
	// Pessoa - ver controllers/pessoa-controller.js#filtroEmail/emailLivre.
	email: { type: String, index: true },
	emailsAlternativos: { type: [String], index: true, default: undefined },
	telefone: { type: String },
	// 'brasileiro' | 'paraguaio' | 'uruguaio' | 'venezuelano'
	nacionalidade: { type: String },

	// Login do dashboard próprio - mesmo padrão já usado em avaliador-schema.js/
	// participante-schema.js: primeiro acesso aceita o próprio documento como senha
	// (ver utils/loginBootstrap.js#compareLoginOuBootstrap), depois obriga trocar por
	// uma senha de verdade antes de liberar o resto do dashboard.
	password: { type: String },
	senhaDefinida: { type: Boolean, default: false },
	resetPasswordToken: { type: String },
	resetPasswordCreatedDate: { type: Date }, // guarda a expiração, não a criação

	// Troca de e-mail pela própria pessoa (routes/index.js#/conta/alterar-email): o e-mail é o
	// login, então só passa a valer depois de confirmado pelo link enviado ao endereço novo.
	emailPendente: { type: String },
	// 'principal' (troca o e-mail principal) ou 'alternativo' (acrescenta um e-mail de acesso).
	// Ausente = 'principal' (pedidos feitos antes de existir e-mail alternativo).
	emailPendenteTipo: { type: String },
	emailPendenteToken: { type: String },
	emailPendenteExpira: { type: Date },

	token: { type: String },
	createdAt: { type: Date }
}, { collection: 'pessoas' });

PessoaSchema.methods.hasExpired = function(){
	return Date.now() > this.resetPasswordCreatedDate;
};

// Sem parâmetro next: o mongoose 9 deixa de passar next() pro middleware pre (já pronto pra ele).
PessoaSchema.pre('save', function() {
	if (!this.token || this.token === "" || this.token === undefined) {
		this.token = new mongoose.Types.ObjectId().valueOf();
	}
	if (!this.createdAt) {
		this.createdAt = Date.now();
	}
});

const Pessoa = module.exports = mongoose.model('Pessoa', PessoaSchema);
