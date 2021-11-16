//Leandro Henrique Kopp Ferreira - 14/10/2021
'use strict';

const mongoose = require('mongoose')
,	Schema = mongoose.Schema;

//Definição do Schema de cadastro de documentos 
const CadastroDocumentoSchema = new Schema({
    //Mateus Roberto Algayer - 15/11/2021
    // id: { 
    //     type: Number
    // },
    pdf: {
        type: String
    },
    titulo: {
        type: String
    },
    ano: {
        type: Number
    },
    exibe: {
        type: Boolean
    }   
}, {collection: 'documentos'}); 

//exporta o Model do Schema
const Documentos = module.exports = mongoose.model('Documentos', CadastroDocumentoSchema);