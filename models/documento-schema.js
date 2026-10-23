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
    },
    // Mostra (Feira tipo:'edicao') do documento - cada documento é de UMA Mostra, mesmo com duas
    // Mostras no mesmo ano; "ano" acima continua gravado (= ano da Mostra). Documento antigo sem
    // feiraId: ver scripts/migrar-documentos-mostra.js e o seletor da tela Cadastrar Documento.
    feiraId: { type: Schema.Types.ObjectId, ref: 'Feira' }
}, {collection: 'documentos'});

//exporta o Model do Schema
const Documentos = module.exports = mongoose.model('Documentos', CadastroDocumentoSchema);