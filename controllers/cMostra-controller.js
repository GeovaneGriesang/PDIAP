'use strict'

const mongoose = require('mongoose');

//exporta a função createMostra que serve para salvar a Schema preenchida na base do mongo 

//Nota: melhorar o tratamento de erros dessa função quando possível
module.exports.createMostra = ( novaMostra, callback) => {
	novaMostra.save((err, callback) => {
        if(err){
            throw err;
        }
        return 0;
    })
};