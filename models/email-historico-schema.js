'use strict';

const mongoose = require('mongoose')
,	Schema = mongoose.Schema;

// Um registro por clique em "Enviar" nas 4 telas de e-mail em massa (Projetos > Enviar e-mail,
// Avaliação > E-mail para avaliadores/premiados, Participantes > Enviar e-mail) - não um
// registro por destinatário, pra não inflar a coleção com milhares de linhas repetindo o mesmo
// assunto/corpo. `destinatarios` guarda os e-mails de verdade (não só a quantidade), como
// pedido, então dá pra conferir quem recebeu depois. Consultado por ano (ver Histórico de
// E-mails no menu) - mesmo espírito de guardar por ano do models/feira-schema.js.
const EmailHistoricoSchema = new Schema({
	ano: {type: Number},
	data: {type: Date, default: Date.now},
	// De qual tela partiu o envio - só pra identificar/filtrar na listagem.
	origem: {type: String, enum: ['projetos', 'premiados', 'avaliadores', 'participantes']},
	destinatarioTipo: {type: String}, // 'principal'/'orientadores'/'alunos'/'todosIntegrantes' - N/A pra avaliadores/participantes
	assunto: {type: String},
	corpo: {type: String},
	usuario: {type: String}, // req.user.username de quem clicou em Enviar
	destinatarios: [{type: String}],
	quantidade: {type: Number}
}, {collection: 'emailHistorico'});

const EmailHistorico = module.exports = mongoose.model('EmailHistorico', EmailHistoricoSchema);
