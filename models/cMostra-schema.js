'use strict';

const mongoose = require('mongoose')
,	Schema = mongoose.Schema;

//Definição do Schema de cadastro da mostra, assim dizendo para o mongo para onde levar a informação e o que esperar de informação 
const CadastroMostraSchema = new Schema({
    imagem: {
        type: String
    },
    textoaluno: {
        type: String
    },
    textoorientador: {
        type: String
    },
    textosaberes: {
        type: String
    },
    textopremiado: {
        type: String
    },
    textoparticipante: {
        type: String
    },
    textohonrosa: {
        type: String
    },
    textoacademica: {
        type: String
    },
    createdAt: {
		type: Date
	}
}, {collection: 'mostra'}); 

//exporta o Model do Schema
const Mostra = module.exports = mongoose.model('Mostra', CadastroMostraSchema);