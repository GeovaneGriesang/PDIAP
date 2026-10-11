'use strict';

// Rotas do antigo painel próprio do(a) participante. Desde o painel único (ver utils/sessao.js)
// tudo virou da conta: quem está logado, senha e recuperação de senha em routes/index.js
// (/conta/loggedin, /conta/trocar-senha, /conta/esqueci-senha, /conta/nova-senha/:token - esta
// aceita também tokens antigos gravados no Participante), e os certificados o painel busca pelo
// documento (services/certificadosService.js#listarCertificados). As URLs antigas de tela
// (/participantes/dashboard/...) continuam servidas por routes/index.js e redirecionam pro /painel.
// Router mantido (montado em app.js) pra não quebrar quem ainda importar o arquivo.
const router = require('express').Router();

module.exports = router;
