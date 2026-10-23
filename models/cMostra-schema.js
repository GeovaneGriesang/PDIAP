//Mateus Roberto Algayer - 14/10/2021
'use strict';

const mongoose = require('mongoose')
,	Schema = mongoose.Schema;

//Definição do Schema de cadastro da mostra, assim dizendo para o mongo para onde levar a informação e o que esperar de informação 
const CadastroMostraSchema = new Schema({
    imagem: {
        type: String
    },
    imagemFundo: {
        type: String
    },
    textoAvaliador: {
        type: String
    },
    textoOrientador: {
        type: String
    },
    textoApresentacao: {
        type: String
    },
    textoPremiado: {
        type: String
    },
    textoMencao: {
        type: String
    },
    textoSaberes: {
        type: String
    },
    textoPOficinas: {
        type: String
    },
    textoROficinas: {
        type: String
    },
    textoAcademica: {
        type: String
    },
    textoDocentes: {
        type: String
    },
    textoPPalestra: {
        type: String
    },
    textoRPalestra: {
        type: String
    },
    ano_certificado: {
		type: Number
	},
	// Mostra (Feira tipo:'edicao') deste certificado - um certificado por Mostra, mesmo com duas
	// Mostras no mesmo ano. Certificado antigo sem feiraId vale pro ano todo (ano_certificado) até
	// a Mostra ganhar o seu - ver certificadosService.js#layoutDoCertificado.
	feiraId: { type: Schema.Types.ObjectId, ref: 'Feira' }
}, {collection: 'mostra'});

//exporta o Model do Schema
const Mostra = module.exports = mongoose.model('Mostra', CadastroMostraSchema);