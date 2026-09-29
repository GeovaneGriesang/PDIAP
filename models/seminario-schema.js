'use strict';

const mongoose = require('mongoose')
,	Schema = mongoose.Schema;

// Uma edição de seminário dentro do tipo genérico de Evento "Seminário" (ver
// models/evento-schema.js#tipo). Até agora só existia "Saberes Docentes", fixo como um dos 4
// tipos de Evento - isso generaliza pra permitir outros seminários futuros com o mesmo
// mecanismo de percentual de frequência (ver utils/certificadoSeminario.js), sem precisar
// inventar um novo tipo fixo no dropdown de Evento a cada vez.
const SeminarioSchema = new Schema({
	nome: {type: String, required: true} // ex: "Saberes Docentes"
	// Mostra (Feira tipo:'edicao') a que este Seminário pertence - mesmo padrão de
	// models/evento-schema.js#feiraId. Seminário migrado de um ano sem Mostra própria
	// cadastrada fica sem feiraId e cai no ano de createdAt (ver adminAPI.pertenceAMostra).
	,feiraId: {type: Schema.Types.ObjectId, ref: 'Feira'}
	,createdAt: {type: Date, default: Date.now}
}, { collection: 'seminarios' });

const Seminario = module.exports = mongoose.model('Seminario', SeminarioSchema);
