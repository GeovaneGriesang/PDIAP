'use strict';

// Um trabalho entregue a um(a) avaliador(a) na etapa PRÉVIA (Feira.avaliacaoPrevia) - criado pela
// distribuição automática (controllers/avaliacao-previa-controller.js#distribuir). Guarda o
// convite/aceite, a ficha usada (cópia da ficha da categoria no momento da avaliação, pra
// alteração posterior da ficha não mudar nota já dada) e as notas.
//
// situacao: 'convidado' (aguardando aceite até responderAte) | 'aceito' (avaliando) |
// 'concluido' | 'recusado' | 'expirado' (não respondeu o convite a tempo) | 'removido' (pela
// organização). Os três primeiros ocupam vaga do trabalho; os outros liberam pra substituição.

const mongoose = require('mongoose')
,	Schema = mongoose.Schema;

const AvaliacaoPreviaSchema = new Schema({
	feiraId: { type: Schema.Types.ObjectId, ref: 'Feira', required: true },
	projeto: { type: Schema.Types.ObjectId, ref: 'Projeto', required: true },
	avaliador: { type: Schema.Types.ObjectId, ref: 'Avaliador', required: true },
	pessoa: { type: Schema.Types.ObjectId, ref: 'Pessoa', required: true },
	situacao: { type: String, enum: ['convidado', 'aceito', 'concluido', 'recusado', 'expirado', 'removido'], required: true },
	criadoEm: { type: Date },
	responderAte: { type: Date },
	respondidoEm: { type: Date },
	motivoRecusa: { type: String },
	ficha: [{ nome: { type: String }, maximo: { type: Number }, _id: false }],
	notas: [{ type: Number }],
	total: { type: Number },
	maximo: { type: Number },
	parecer: { type: String },
	salvoEm: { type: Date },
	concluidoEm: { type: Date },
	// Lembretes já mandados ('convite', 'prazo3', 'prazo1') - cada um sai uma vez só.
	lembretes: [{ type: String }]
}, { collection: 'avaliacoesPrevias' });

// Mesma pessoa nunca recebe o mesmo trabalho duas vezes (nem depois de recusar) - e protege a
// distribuição de rodar em dobro ao mesmo tempo.
AvaliacaoPreviaSchema.index({ projeto: 1, avaliador: 1 }, { unique: true });
AvaliacaoPreviaSchema.index({ feiraId: 1, situacao: 1 });
AvaliacaoPreviaSchema.index({ pessoa: 1 });

module.exports = mongoose.model('AvaliacaoPrevia', AvaliacaoPreviaSchema);
