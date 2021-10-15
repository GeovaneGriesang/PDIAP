//Leandro Henrique Kopp Ferreira - 14/10/2021
'use strict'

const mongoose = require('mongoose');

//exporta a função createMostra que serve para salvar a Schema preenchida na base do mongo 

module.exports.createDocumento = ( novoDocumento, callback) => {
	novoDocumento.save((err, callback) => {
        if(err){
            throw err;
        }
        return 0;
    })
};