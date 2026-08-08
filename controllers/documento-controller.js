//Leandro Henrique Kopp Ferreira - 14/10/2021
'use strict'

const mongoose = require('mongoose');

//exporta a função createMostra que serve para salvar a Schema preenchida na base do mongo 

module.exports.createDocumento = ( novoDocumento, callback) => {
	try {
        novoDocumento.save((err) => {
            if (err) { console.error('Erro ao salvar Schema preenchido na base do mongo', err); return; }
        })
    } catch (error) {
        console.log('findOne error--> ${error}'); // Alteração Lucas Ferreira
    }
};