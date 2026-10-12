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
, adminSchema = require('../models/admin-schema')
, Admin = require('../controllers/admin-controller')
, documentoValidator = require('../utils/documentoValidator')
, pessoaController = require('../controllers/pessoa-controller')
, sessao = require('../utils/sessao');

const TRAVA_MS = 3 * 60 * 1000;

// Campos que os integrantes podem alterar e a opção de Editar > Campos editáveis (admin) que
// libera cada um. Qualquer outro campo do body (aprovado, premiacao, token...) é ignorado.
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

function opcoesAtuais() {
  return new Promise((resolve) => {
    Admin.getOpcoesAtuais((err, docs) => resolve((!err && docs && docs[0] && docs[0].opcoes) || {}));
  });
}

// Só o projeto da edição atual pode ser alterado - ano do projeto (createdAt) contra o "ano"
// da edição em Editar > Tela inicial (texto livre, ex "de 2026": pega os 4 dígitos). Mesma
// regra que valia na área antiga do projeto.
async function edicaoAnterior(projeto) {
  let admin = await adminSchema.findOne({ username: 'admin2' }, 'ano');
  let m = admin && admin.ano != null && String(admin.ano).match(/\d{4}/);
  let anoAdmin = m ? parseInt(m[0], 10) : null;
  return !!(anoAdmin && new Date(projeto.createdAt).getFullYear() !== anoAdmin);
}

// Carrega o projeto `req.params.id` só se a Pessoa logada for integrante dele (pelo vínculo
// com a Pessoa ou, em registro antigo sem vínculo, pelo documento). Põe em req.projeto/
// req.pessoa; responde 403/404 sozinho.
async function exigeIntegrante(req, res, next) {
  try {
    if (!req.isAuthenticated() || !sessao.ehPessoa(req.user)) return res.sendStatus(403);
    if (!idValido(req.params.id)) return res.status(400).send('ID inválido.');
    let pessoa = req.user;
    let doc = new RegExp('^' + escaparRegex(pessoa.documento || '') + '$', 'i');
    let projeto = await ProjetoSchema.findOne({
      _id: req.params.id,
      integrantes: { $elemMatch: { $or: [{ pessoa: pessoa._id }, { cpf: doc }] } }
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

// Edição liberada? (edição atual + projeto ainda existe) - não olha a trava.
async function motivoBloqueio(projeto) {
  if (await edicaoAnterior(projeto)) return 'Este projeto é de uma edição anterior e não pode mais ser alterado.';
  return null;
}

// Gravação: exige edição liberada e a trava DESTA pessoa com o código certo (X-Trava). Renova
// a trava a cada gravação.
async function exigeTrava(req, res, next) {
  try {
    let bloqueio = await motivoBloqueio(req.projeto);
    if (bloqueio) return res.status(403).send(bloqueio);
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
    req.opcoes = await opcoesAtuais();
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
    let bloqueio = await motivoBloqueio(req.projeto);
    projeto._painel = {
      edicaoPermitida: !bloqueio,
      motivoBloqueio: bloqueio || undefined,
      trava: estadoTrava(req.projeto, req.pessoa)
    };
    delete projeto.trava;
    res.send(projeto);
  } catch (err) {
    console.error('Erro ao ler projeto do painel', err);
    res.status(500).send('Erro ao carregar o projeto.');
  }
});

// --- trava -------------------------------------------------------------------------------

// Pega a trava (ou renova, se já é dela). Devolve o código que toda gravação precisa mandar.
router.post('/:id/trava', exigeIntegrante, async (req, res) => {
  try {
    let bloqueio = await motivoBloqueio(req.projeto);
    if (bloqueio) return res.status(403).send(bloqueio);
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

// Relatório em PDF (até 10MB), salvo como public/relatorios/<numInscricao>.pdf - mesma regra e
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
    if (!req.projeto.numInscricao) {
      fs.unlink(arquivo.filepath, () => {});
      return res.status(400).send('O projeto ainda não tem número de inscrição.');
    }
    try {
      let pasta = path.join(__dirname, '..', 'public', 'relatorios');
      await fs.promises.mkdir(pasta, { recursive: true });
      let destino = path.join(pasta, req.projeto.numInscricao + '.pdf');
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

module.exports = router;
