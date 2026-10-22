'use strict';

// Relatório (PDF) enviado pelo projeto (Projeto.relatorio2). Fica FORA de public/, em
// uploads/relatorios/<_id do projeto>.pdf, e só sai por rota com permissão (integrante, admin da
// Mostra, quem avalia o trabalho no evento). Antes ficava em public/relatorios/<numInscricao>.pdf:
// aberto a qualquer um e sobrescrito entre anos (numInscricao se repete) - ver
// scripts/migrar-relatorios.js.

const path = require('path')
,	fs = require('fs');

const PASTA = path.join(__dirname, '..', 'uploads', 'relatorios');
module.exports.PASTA = PASTA;
module.exports.arquivoDoProjeto = (projetoId) => path.join(PASTA, String(projetoId) + '.pdf');
module.exports.garantirPasta = () => fs.promises.mkdir(PASTA, { recursive: true });
module.exports.existe = (projeto) => !!(projeto && projeto.relatorio2 && fs.existsSync(module.exports.arquivoDoProjeto(projeto._id)));

// Nome do arquivo baixado: nº + nome do projeto, sem caracteres inválidos em nome de arquivo.
module.exports.nomeParaDownload = (projeto) =>
	((projeto.numInscricao ? projeto.numInscricao + '_' : '') + (projeto.nomeProjeto || 'relatorio')).replace(/[\/\\:*?"<>|]/g, '_').trim().slice(0, 150) + '.pdf';
