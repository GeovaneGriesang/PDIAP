'use strict'

const mongoose = require('mongoose');

//exporta a função createMostra que serve para salvar a Schema preenchida na base do mongo 

//Nota: melhorar o tratamento de erros dessa função quando possível
module.exports.createMostra = ( novaMostra, callback) => {
	try {
        novaMostra.save((err) => {
            if (err) { console.error('Erro ao salvar Schema preenchida na base do mongo', err); return; }
        })
    } catch (error) {
        console.log('findOne error--> ${error}'); // Alteração Lucas Ferreira
    }
};