'use strict';

// Projeto dentro do "Meu painel" (montado em /api/painel/projetos, ver app.js). Substitui o
// login PRÓPRIO do projeto: qualquer integrante (estudante ou orientador(a)) logado(a) com a
// própria conta abre o projeto e, quando a edição está liberada, altera.
//
// Vários integrantes podem abrir o mesmo projeto ao mesmo tempo, mas só um edita por vez:
// "Editar" pega a TRAVA do projeto (Projeto.trava), que o navegador renova a cada minuto
// enquanto a tela de edição está aberta. A trava vence sozinha (TRAVA_MS) se o navegador some;
// o navegador também a solta depois de 15 min sem atividade. Quem não está com a trava só lê.
//
// Toda gravação exige o código da trava (cabeçalho X-Trava) devolvido ao pegá-la: se a trava
// venceu e alguém pegou (e talvez alterou) nesse meio-tempo, o código não bate mais e a gravação
// é recusada - é a "checagem de versão" que impede sobrescrever o que outra pessoa salvou.

const express = require('express')
, router = express.Router()
, crypto = require('crypto')
, fs = require('fs')
, path = require('path')
, formidable = require('formidable')
, ProjetoSchema = require('../models/projeto-schema')
, opcoesProjetos = require('../controllers/opcoes-projetos-controller')
, documentoValidator = require('../utils/documentoValidator')
, pessoaController = require('../controllers/pessoa-controller')
, sessao = require('../utils/sessao')
, pendencias = require('../utils/pendencias')
, avaliacaoPrevia = require('../controllers/avaliacao-previa-controller')
, relatorioProjeto = require('../utils/relatorioProjeto');

const TRAVA_MS = 3 * 60 * 1000;

// Campos que os integrantes podem alterar e a opção de Mostra > Campos editáveis (admin, POR
// MOSTRA - ver controllers/opcoes-projetos-controller.js) que libera cada um. Qualquer outro campo do body (aprovado, premiacao, token...) é ignorado.
// hospedagem também é limpa ao trocar alunos (aba Aluno(s)), por isso vale com "integrantes".
const CAMPO_OPCAO = {
  nomeProjeto: ['nomeProjeto'], palavraChave: ['palavras_chave'], categoria: ['categoria'], eixo: ['eixo'],
  participa: ['participa'], resumo: ['resumo'],
  escola: ['instituicao'], nomeEscola: ['instituicao'], estado: ['instituicao'], cidade: ['instituicao'], cep: ['instituicao'],
  hospedagem: ['hospedagem', 'integrantes']
};

// O que nunca sai daqui pro navegador.
const PROJECAO_SEGURA = '-password -resetPasswordToken -resetPasswordCreatedDate -username -trava.token';

function idValido(id) {
  return typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
}

function splita(arg) {
  if (arg !== undefined && arg !== null) return String(arg).replace(/([-.() ])/g, '');
}

function escaparRegex(texto) {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Carrega o projeto `req.params.id` só se a Pessoa logada for integrante dele (pelo vínculo
// com a Pessoa ou, em registro antigo sem vínculo, pelo documento). Põe em req.projeto/
// req.pessoa; responde 403/404 sozinho.
async function exigeIntegrante(req, res, next) {
  try {
    if (!req.isAuthenticated() || !sessao.ehPessoa(req.user)) return res.sendStatus(403);
    if (!idValido(req.params.id)) return res.status(400).send('ID inválido.');
    let pessoa = req.user;
    // Pelo vínculo com a Pessoa ou, em registro antigo sem vínculo, pelo documento - só se ela TEM
    // documento (sem ele, '^$' casaria com qualquer integrante de documento vazio).
    let ehDela = [{ pessoa: pessoa._id }];
    if (pessoa.documento) ehDela.push({ cpf: new RegExp('^' + escaparRegex(pessoa.documento) + '$', 'i') });
    let projeto = await ProjetoSchema.findOne({
      _id: req.params.id,
      integrantes: { $elemMatch: { $or: ehDela } }
    });
    if (!projeto) return res.status(404).send('Projeto não encontrado entre os seus.');
    req.pessoa = pessoa;
    req.projeto = projeto;
    next();
  } catch (err) {
    console.error('Erro ao carregar projeto do painel', err);
    res.status(500).send('Erro ao carregar o projeto.');
  }
}

function estadoTrava(projeto, pessoa) {
  let t = projeto.trava;
  let ativa = !!(t && t.pessoa && t.expira && t.expira > new Date());
  return {
    ativa: ativa,
    minha: ativa && String(t.pessoa) === String(pessoa._id),
    nome: ativa ? t.nome : undefined,
    expira: ativa ? t.expira : undefined
  };
}

// Edição liberada? Vale o que a Mostra DO PROJETO libera em Campos editáveis - projeto de
// edição passada fica com tudo desligado (ver opcoes-projetos-controller). Não olha a trava.
async function situacaoEdicao(projeto) {
  let r = await opcoesProjetos.opcoesDoProjeto(projeto);
  let motivo = null;
  if (!r.mostra) motivo = 'Este projeto não está ligado a uma Mostra. Alterações, só com a organização.';
  else if (!opcoesProjetos.FLAGS.some((k) => r.opcoes[k])) motivo = 'A organização não liberou alterações nos projetos desta Mostra agora.';
  return { mostra: r.mostra, opcoes: r.opcoes, motivo: motivo };
}

// Gravação: exige edição liberada (pela Mostra) e a trava DESTA pessoa com o código certo (X-Trava). Renova
// a trava a cada gravação.
async function exigeTrava(req, res, next) {
  try {
    // Cadastro com pendência (utils/pendencias.js): nada muda até corrigir.
    if (pendencias.daPessoa(req.pessoa).length) return res.status(403).send('Antes de alterar o projeto, corrija os dados do seu cadastro (Meu painel > Corrija seus dados).');
    let situacao = await situacaoEdicao(req.projeto);
    if (situacao.motivo) return res.status(403).send(situacao.motivo);
    let codigo = (req.get('X-Trava') || '').toString();
    let t = req.projeto.trava;
    let ok = codigo && t && t.token === codigo && String(t.pessoa) === String(req.pessoa._id);
    if (!ok) {
      let estado = estadoTrava(req.projeto, req.pessoa);
      return res.status(409).send(estado.ativa && !estado.minha
        ? estado.nome + ' está editando este projeto agora. As suas alterações não foram salvas.'
        : 'A sua edição foi encerrada (tempo sem atividade ou outra pessoa editou depois). Recarregue o projeto antes de alterar de novo.');
    }
    // Trava vencida mas ainda dela (ninguém pegou): vale e é renovada.
    await ProjetoSchema.updateOne({ _id: req.projeto._id, 'trava.token': codigo }, { $set: { 'trava.expira': new Date(Date.now() + TRAVA_MS) } });
    req.opcoes = situacao.opcoes;
    next();
  } catch (err) {
    console.error('Erro ao conferir a trava do projeto', err);
    res.status(500).send('Erro ao conferir a edição do projeto.');
  }
}

// --- leitura -----------------------------------------------------------------------------

router.get('/:id', exigeIntegrante, async (req, res) => {
  try {
    let projeto = await ProjetoSchema.findById(req.projeto._id, PROJECAO_SEGURA).lean();
    let situacao = await situacaoEdicao(req.projeto);
    projeto._painel = {
      edicaoPermitida: !situacao.motivo,
      motivoBloqueio: situacao.motivo || undefined,
      mostra: situacao.mostra ? { nome: situacao.mostra.nome, ano: situacao.mostra.ano } : undefined,
      opcoes: situacao.opcoes,
      trava: estadoTrava(req.projeto, req.pessoa),
      // Envio do texto pra avaliação prévia (Feira.avaliacaoPrevia da Mostra do projeto).
      textoPrevia: avaliacaoPrevia.situacaoEnvio(situacao.mostra),
      // Arquivo do relatório guardado (relatorio2 marcado sem arquivo = perdido antes da migração).
      temRelatorio: relatorioProjeto.existe(req.projeto)
    };
    delete projeto.trava;
    res.send(projeto);
  } catch (err) {
    console.error('Erro ao ler projeto do painel', err);
    res.status(500).send('Erro ao carregar o projeto.');
  }
});

// Campos editáveis da Mostra do projeto (o formulário de edição desabilita o que está desligado).
router.get('/:id/opcoes', exigeIntegrante, async (req, res) => {
  try {
    res.send((await situacaoEdicao(req.projeto)).opcoes);
  } catch (err) {
    console.error('Erro ao ler opções do projeto', err);
    res.status(500).send('error');
  }
});

// --- trava -------------------------------------------------------------------------------

// Pega a trava (ou renova, se já é dela). Devolve o código que toda gravação precisa mandar.
router.post('/:id/trava', exigeIntegrante, async (req, res) => {
  try {
    if (pendencias.daPessoa(req.pessoa).length) return res.status(403).send('Antes de alterar o projeto, corrija os dados do seu cadastro (Meu painel > Corrija seus dados).');
    let situacao = await situacaoEdicao(req.projeto);
    if (situacao.motivo) return res.status(403).send(situacao.motivo);
    let agora = new Date();
    let atual = req.projeto.trava;
    // Já é dela e ainda vale: mantém o mesmo código (outra aba dela continua funcionando).
    let codigo = (atual && atual.token && String(atual.pessoa) === String(req.pessoa._id) && atual.expira > agora)
      ? atual.token : crypto.randomBytes(16).toString('hex');
    let r = await ProjetoSchema.findOneAndUpdate(
      { _id: req.projeto._id, $or: [{ 'trava.pessoa': req.pessoa._id }, { 'trava.expira': { $lt: agora } }, { 'trava.pessoa': { $exists: false } }] },
      { $set: { trava: { pessoa: req.pessoa._id, nome: req.pessoa.nome, expira: new Date(Date.now() + TRAVA_MS), token: codigo } } },
      { returnDocument: 'after', projection: 'trava' }
    );
    if (!r) {
      let estado = estadoTrava(await ProjetoSchema.findById(req.projeto._id, 'trava'), req.pessoa);
      return res.status(409).send({ nome: estado.nome, expira: estado.expira });
    }
    res.send({ codigo: codigo, expira: r.trava.expira });
  } catch (err) {
    console.error('Erro ao pegar a trava do projeto', err);
    res.status(500).send('Erro ao abrir a edição.');
  }
});

router.post('/:id/trava/renovar', exigeIntegrante, async (req, res) => {
  try {
    let codigo = (req.get('X-Trava') || '').toString();
    let r = codigo && await ProjetoSchema.findOneAndUpdate(
      { _id: req.projeto._id, 'trava.token': codigo, 'trava.pessoa': req.pessoa._id },
      { $set: { 'trava.expira': new Date(Date.now() + TRAVA_MS) } },
      { returnDocument: 'after', projection: 'trava' }
    );
    if (!r) return res.status(409).send('A sua edição foi encerrada.');
    res.send({ expira: r.trava.expira });
  } catch (err) {
    console.error('Erro ao renovar a trava do projeto', err);
    res.status(500).send('error');
  }
});

router.post('/:id/trava/liberar', exigeIntegrante, async (req, res) => {
  try {
    let codigo = (req.get('X-Trava') || '').toString();
    if (codigo) await ProjetoSchema.updateOne({ _id: req.projeto._id, 'trava.token': codigo }, { $unset: { trava: 1 } });
    res.send('ok');
  } catch (err) {
    console.error('Erro ao liberar a trava do projeto', err);
    res.status(500).send('error');
  }
});

// --- gravações (todas exigem a trava) ----------------------------------------------------

router.put('/:id', exigeIntegrante, exigeTrava, async (req, res) => {
  let campos = {};
  Object.keys(CAMPO_OPCAO).forEach((campo) => {
    if (req.body[campo] === undefined) return;
    if (CAMPO_OPCAO[campo].some((opcao) => req.opcoes[opcao] === true)) campos[campo] = req.body[campo];
  });
  if (campos.cep !== undefined) campos.cep = splita(campos.cep);
  // palavraChave chega como lista (tela) e é gravada como texto separado por vírgula.
  if (Array.isArray(campos.palavraChave)) campos.palavraChave = campos.palavraChave.join(',');
  if (Array.isArray(campos.hospedagem)) campos.hospedagem = campos.hospedagem.join(',');
  if (campos.participa !== undefined) campos.participa = campos.participa === true || campos.participa === 'true';
  if (!Object.keys(campos).length) return res.status(403).send('Nenhum dos campos enviados está liberado para alteração agora.');
  try {
    campos.updatedAt = Date.now();
    await ProjetoSchema.updateOne({ _id: req.projeto._id }, { $set: campos });
    res.send({ salvo: Object.keys(campos).filter((c) => c !== 'updatedAt') });
  } catch (err) {
    console.error('Erro ao alterar projeto pelo painel', err);
    res.status(500).send('Erro ao salvar o projeto.');
  }
});

// Integrantes novos (sem _id) entram; existentes (com _id) são atualizados. Mesmas validações
// da inscrição e mesmo vínculo com a Pessoa (pessoaController.vincularPessoa).
router.put('/:id/integrantes', exigeIntegrante, exigeTrava, async (req, res) => {
  if (req.opcoes.integrantes !== true) return res.status(403).send('A alteração de integrantes não está liberada agora.');
  let lista = Array.isArray(req.body) ? req.body : [];
  try {
    let preparados = [];
    for (let v of lista) {
      if (!v || (v.tipo !== 'Orientador' && v.tipo !== 'Aluno')) return res.status(400).send('Integrante inválido.');
      let checagemDoc = documentoValidator.validarDocumentoQualquerPais(v.cpf);
      if (!checagemDoc.valido) return res.status(400).send(checagemDoc.mensagem);
      let checagemTelefone = documentoValidator.validarTelefone(v.telefone);
      if (!checagemTelefone.valido) return res.status(400).send(checagemTelefone.mensagem);
      let integrante = {
        tipo: v.tipo, nome: v.nome, email: v.email, nacionalidade: v.nacionalidade,
        cpf: checagemDoc.normalizado, telefone: splita(v.telefone), tamCamiseta: v.tamCamiseta
      };
      integrante.pessoa = await pessoaController.vincularPessoa(integrante);
      if (v._id !== undefined) {
        if (!idValido(v._id) || !req.projeto.integrantes.id(v._id)) return res.status(400).send('Integrante não encontrado neste projeto.');
        integrante._id = v._id;
      }
      preparados.push(integrante);
    }
    for (let integrante of preparados) {
      if (integrante._id) {
        await ProjetoSchema.updateOne({ _id: req.projeto._id, 'integrantes._id': integrante._id },
          { $set: { 'integrantes.$': integrante, updatedAt: Date.now() } });
      } else {
        await ProjetoSchema.updateOne({ _id: req.projeto._id }, { $push: { integrantes: integrante }, $set: { updatedAt: Date.now() } });
      }
    }
    res.send('success');
  } catch (err) {
    console.error('Erro ao alterar integrantes pelo painel', err);
    res.status(500).send('Erro ao salvar os integrantes.');
  }
});

router.put('/:id/integrantes/remover', exigeIntegrante, exigeTrava, async (req, res) => {
  if (req.opcoes.integrantes !== true) return res.status(403).send('A alteração de integrantes não está liberada agora.');
  let id = req.body.integrantes_id;
  let alvo = idValido(id) && req.projeto.integrantes.id(id);
  if (!alvo) return res.status(400).send('Integrante não encontrado neste projeto.');
  let restantes = req.projeto.integrantes.filter((i) => String(i._id) !== String(id) && i.tipo === alvo.tipo);
  if (!restantes.length) return res.status(400).send('O projeto precisa de pelo menos um(a) ' + (alvo.tipo === 'Orientador' ? 'orientador(a)' : 'estudante') + '.');
  try {
    await ProjetoSchema.updateOne({ _id: req.projeto._id }, { $pull: { integrantes: { _id: id } }, $set: { updatedAt: Date.now() } });
    res.send('success');
  } catch (err) {
    console.error('Erro ao remover integrante pelo painel', err);
    res.status(500).send('Erro ao remover o integrante.');
  }
});

// Relatório em PDF (até 10MB), salvo fora de public/ (utils/relatorioProjeto.js) - mesma regra e
// mesmas checagens (extensão, tipo e assinatura %PDF-) da área antiga do projeto.
router.post('/:id/relatorio', exigeIntegrante, exigeTrava, (req, res) => {
  if (req.opcoes.upload !== true) return res.status(403).send('O envio de relatório não está liberado agora.');
  let form = new formidable.IncomingForm();
  form.maxFileSize = 10 * 1024 * 1024;
  form.parse(req, async (err, fields, files) => {
    let arquivo = files && files.file && files.file[0];
    if (err || !arquivo) return res.status(400).send('Falha no upload (arquivo ausente ou maior que 10MB).');
    let assinaturaValida = false;
    try {
      let fd = fs.openSync(arquivo.filepath, 'r');
      let buffer = Buffer.alloc(5);
      fs.readSync(fd, buffer, 0, 5, 0);
      fs.closeSync(fd);
      assinaturaValida = buffer.toString('ascii') === '%PDF-';
    } catch (e) {}
    if (!(arquivo.originalFilename || '').toLowerCase().endsWith('.pdf') || arquivo.mimetype !== 'application/pdf' || !assinaturaValida) {
      fs.unlink(arquivo.filepath, () => {});
      return res.status(400).send('Arquivo inválido: envie um PDF de até 10MB.');
    }
    try {
      await relatorioProjeto.garantirPasta();
      let destino = relatorioProjeto.arquivoDoProjeto(req.projeto._id);
      try {
        await fs.promises.rename(arquivo.filepath, destino);
      } catch (e) {
        // Pasta temporária em outro disco: rename não funciona, copia e apaga.
        await fs.promises.copyFile(arquivo.filepath, destino);
        fs.unlink(arquivo.filepath, () => {});
      }
      await ProjetoSchema.updateOne({ _id: req.projeto._id },
        { $set: { relatorio2: { name: arquivo.originalFilename, size: arquivo.size, uploadAt: arquivo.mtime || new Date() }, updatedAt: Date.now() } });
      res.send('Relatório enviado.');
    } catch (e) {
      console.error('Erro ao salvar relatório pelo painel', e);
      res.status(500).send('Erro ao salvar o relatório.');
    }
  });
});

router.get('/:id/relatorio', exigeIntegrante, (req, res) => {
  if (!relatorioProjeto.existe(req.projeto)) return res.status(404).send('O relatório ainda não foi enviado.');
  res.download(relatorioProjeto.arquivoDoProjeto(req.projeto._id), relatorioProjeto.nomeParaDownload(req.projeto));
});

// --- texto da avaliação PRÉVIA (controllers/avaliacao-previa-controller.js) ---------------
// Qualquer integrante envia (sem trava: é um arquivo só, o último envio vale) dentro do prazo da
// Mostra, com o cadastro em dia. Fica fora de public/ - só sai pela rota GET abaixo.
router.post('/:id/texto-previa', exigeIntegrante, async (req, res) => {
  try {
    if (pendencias.daPessoa(req.pessoa).length) return res.status(403).send('Antes, corrija os dados do seu cadastro (Meu painel > Corrija seus dados).');
    let situacao = avaliacaoPrevia.situacaoEnvio((await opcoesProjetos.opcoesDoProjeto(req.projeto)).mostra);
    if (!situacao.ativa) return res.status(403).send('Esta Mostra não tem envio de texto para avaliação prévia.');
    if (!situacao.aberto) return res.status(403).send(situacao.motivo || 'O envio do texto não está aberto.');
  } catch (err) {
    console.error('Erro ao conferir envio do texto', err);
    return res.status(500).send('Erro ao enviar o texto.');
  }
  let form = new formidable.IncomingForm();
  form.maxFileSize = 15 * 1024 * 1024;
  form.parse(req, async (err, fields, files) => {
    let arquivo = files && files.file && files.file[0];
    if (err || !arquivo) return res.status(400).send('Falha no envio (arquivo ausente ou maior que 15MB).');
    let assinaturaValida = false;
    try {
      let fd = fs.openSync(arquivo.filepath, 'r');
      let buffer = Buffer.alloc(5);
      fs.readSync(fd, buffer, 0, 5, 0);
      fs.closeSync(fd);
      assinaturaValida = buffer.toString('ascii') === '%PDF-';
    } catch (e) {}
    if (!(arquivo.originalFilename || '').toLowerCase().endsWith('.pdf') || !assinaturaValida) {
      fs.unlink(arquivo.filepath, () => {});
      return res.status(400).send('Arquivo inválido: envie um PDF de até 15MB.');
    }
    try {
      await avaliacaoPrevia.garantirPasta();
      let destino = avaliacaoPrevia.arquivoDoProjeto(req.projeto._id);
      try {
        await fs.promises.rename(arquivo.filepath, destino);
      } catch (e) {
        await fs.promises.copyFile(arquivo.filepath, destino);
        fs.unlink(arquivo.filepath, () => {});
      }
      let info = { nome: arquivo.originalFilename, tamanho: arquivo.size, enviadoEm: new Date(), enviadoPor: req.pessoa._id };
      await ProjetoSchema.updateOne({ _id: req.projeto._id }, { $set: { textoPrevia: info, updatedAt: Date.now() } });
      res.send({ nome: info.nome, tamanho: info.tamanho, enviadoEm: info.enviadoEm });
    } catch (e) {
      console.error('Erro ao salvar texto da avaliação prévia', e);
      res.status(500).send('Erro ao salvar o texto.');
    }
  });
});

router.get('/:id/texto-previa', exigeIntegrante, (req, res) => {
  let arquivo = avaliacaoPrevia.arquivoDoProjeto(req.projeto._id);
  if (!req.projeto.textoPrevia || !fs.existsSync(arquivo)) return res.status(404).send('O texto ainda não foi enviado.');
  res.download(arquivo, req.projeto.textoPrevia.nome || 'texto.pdf');
});

module.exports = router;
