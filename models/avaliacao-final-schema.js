'use strict';

// Um trabalho entregue a um(a) avaliador(a) na avaliação FINAL, no evento (Feira.avaliacaoFinal) -
// criado pela distribuição (controllers/avaliacao-final-controller.js#distribuir) ou pela
// organização. Guarda a ficha usada (cópia no momento da avaliação, pra alteração posterior da ficha
// não mudar nota já dada) e as notas. Ao concluir, a nota vai sozinha pra Projeto.avaliacao (o
// mesmo campo de Avaliação > Inserir e do Ranking) - ver #publicar.
//
// situacao: 'pendente' (ainda não avaliou) | 'concluido' | 'removido' (pela organização - libera a
// vaga e a nota deixa de contar).

const mongoose = require('mongoose')
,	Schema = mongoose.Schema;

const AvaliacaoFinalSchema = new Schema({
	feiraId: { type: Schema.Types.ObjectId, ref: 'Feira', required: true },
	projeto: { type: Schema.Types.ObjectId, ref: 'Projeto', required: true },
	avaliador: { type: Schema.Types.ObjectId, ref: 'Avaliador', required: true },
	pessoa: { type: Schema.Types.ObjectId, ref: 'Pessoa', required: true },
	situacao: { type: String, enum: ['pendente', 'concluido', 'removido'], required: true },
	// 'auto' = distribuição; 'manual' = entregue pela organização.
	origem: { type: String, enum: ['auto', 'manual'] },
	criadoEm: { type: Date },
	removidoEm: { type: Date },
	// parte: 'escrita' | 'apresentacao'. Sem parte escrita na ficha quando ela vem da etapa prévia
	// (escritaDaPrevia = true): a média da prévia soma ao total na hora de ir pro ranking.
	ficha: [{ nome: { type: String }, maximo: { type: Number }, parte: { type: String }, _id: false }],
	escritaDaPrevia: { type: Boolean },
	notas: [{ type: Number }],
	total: { type: Number },
	maximo: { type: Number },
	parecer: { type: String },
	salvoEm: { type: Date },
	concluidoEm: { type: Date },
	// De onde vieram as notas: 'painel' (Meu painel, com internet), 'aparelho' (feita sem internet,
	// guardada no aparelho e enviada depois - avaliadoEm = hora em que foi feita, pelo relógio do
	// aparelho) ou 'papel' (ficha impressa, lançada pela organização - lancadoPor = quem lançou).
	origemNotas: { type: String, enum: ['painel', 'aparelho', 'papel'] },
	avaliadoEm: { type: Date },
	lancadoPor: { type: String },
	// Último aviso por e-mail da lista de trabalhos (só sai o aviso de quem ainda não foi avisado).
	avisadoEm: { type: Date }
}, { collection: 'avaliacoesFinais' });

// Mesma pessoa nunca recebe o mesmo trabalho duas vezes (se for tirada e voltar, o registro antigo
// volta a valer) - e protege a distribuição de rodar em dobro ao mesmo tempo.
AvaliacaoFinalSchema.index({ projeto: 1, avaliador: 1 }, { unique: true });
AvaliacaoFinalSchema.index({ feiraId: 1, situacao: 1 });
AvaliacaoFinalSchema.index({ pessoa: 1 });

module.exports = mongoose.model('AvaliacaoFinal', AvaliacaoFinalSchema);
