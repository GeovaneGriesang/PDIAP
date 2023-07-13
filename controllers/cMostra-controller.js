'use strict'

const mongoose = require('mongoose');

//exporta a função createMostra que serve para salvar a Schema preenchida na base do mongo 

//Nota: melhorar o tratamento de erros dessa função quando possível
module.exports.createMostra = ( novaMostra, callback) => {
	try {
        novaMostra.save((err, callback) => {
            if(err){
                throw new Error('Erro ao salvar Schema preenchida na base do mongo'); // Alteração Lucas Ferreira
            }
            return 0;
        })
    } catch (error) {
        console.log('findOne error--> ${error}'); // Alteração Lucas Ferreira
    }
};