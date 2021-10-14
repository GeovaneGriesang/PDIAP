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
    ano_certificado: {
		type: Number
	}
}, {collection: 'mostra'}); 

//exporta o Model do Schema
const Mostra = module.exports = mongoose.model('Mostra', CadastroMostraSchema);