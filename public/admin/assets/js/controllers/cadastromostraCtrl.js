(function(){
    'use strict';
    angular
    .module('PDIAPa')
    .controller('cadastromostraCtrl', function($scope, $rootScope, $timeout, adminAPI) {

      $scope.certificados = [];
      $scope.mostras = [];
      // Um certificado por MOSTRA (X e XI MOVACI, do mesmo ano, têm o seu cada) - o seletor lista
      // cada Mostra. Certificado antigo sem Mostra (cadastrado por ano) aparece pras Mostras daquele
      // ano que ainda não têm o seu; salvar cria o da Mostra escolhida.
      $scope.mostraId = null;

      // A Mostra padrão (a das outras telas, ou a mais recente) só pode ser definida depois que TANTO
      // a lista de Mostras quanto os certificados chegarem (2 chamadas independentes) - e só depois
      // que o <md-select>+ng-repeat religar as opções (bug conhecido do Angular Material).
      var mostrasProntas = false, certificadosProntos = false;
      var definirMostraPadrao = function() {
        if (!mostrasProntas || !certificadosProntos) return;
        $timeout(function() {
          var existe = $scope.mostras.some(function(m) { return m._id === $rootScope.mostraId; });
          $scope.mostraId = existe ? $rootScope.mostraId : ($scope.mostras.length ? $scope.mostras[0]._id : null);
          $scope.carregaDado($scope.mostraId);
        });
      };

      adminAPI.getMostras()
      .then(function(response) {
          $scope.mostras = (response.data || []).filter(function(m) { return m.tipo === 'edicao'; })
            .sort(function(a, b) { return (b.ano - a.ano) || (String(a._id) < String(b._id) ? 1 : -1); });
          mostrasProntas = true; definirMostraPadrao();
        },
        function(response) { console.log('Error: '+response.data); mostrasProntas = true; definirMostraPadrao(); });

      $scope.mostraDe = function(id) { return $scope.mostras.filter(function(m) { return m._id === id; })[0]; };
      // Certificado que vale pra Mostra: o dela; senão o antigo do ano (sem Mostra).
      $scope.certificadoDaMostra = function(id) {
        var m = $scope.mostraDe(id);
        if (!m) return null;
        return $scope.certificados.filter(function(c) { return c.feiraId === m._id; })[0]
          || $scope.certificados.filter(function(c) { return !c.feiraId && c.ano_certificado == m.ano; })[0] || null;
      };
      // 'proprio' (a Mostra tem o seu) | 'ano' (usa o antigo do ano) | '' (nenhum).
      $scope.situacaoCertificado = function(id) {
        var c = $scope.certificadoDaMostra(id);
        return !c ? '' : (c.feiraId ? 'proprio' : 'ano');
      };

      //algumas scopes para recuperar os dados

      $scope.textocertificado_avaliador;
      $scope.textocertificado_orientador;
      $scope.textocertificado_apresentacao;
      $scope.textocertificado_premiado;
      $scope.textocertificado_mencao;
      $scope.textocertificado_saberes;
      $scope.textocertificado_poficinas;
      $scope.textocertificado_roficinas;
      $scope.textocertificado_academica;
      $scope.textocertificado_docentes;
      $scope.textocertificado_ppalestra;
      $scope.textocertificado_rpalestra;

      // Máscaras disponíveis por campo de texto - variam porque cada certificado é emitido
      // pra um tipo diferente de destinatário/evento (ver homeCtrl.js#emitirCertificado1),
      // então nem todo campo tem os mesmos dados disponíveis pra substituir.
      $scope.mascaras = {
        avaliador: [
          {chave:'nome', desc:'Nome do(a) avaliador(a)'},
          {chave:'email', desc:'E-mail do avaliador'},
          {chave:'categoriasAvaliadas', desc:'Categorias e eixos que avaliou'}
        ],
        orientador: [
          {chave:'nome', desc:'Nome do(a) orientador(a)'},
          {chave:'nomeProjeto', desc:'Nome do projeto'}
        ],
        apresentacao: [
          {chave:'nome', desc:'Nome do(a) aluno(a)'},
          {chave:'nomeProjeto', desc:'Nome do projeto'},
          {chave:'categoria', desc:'Categoria do projeto'}
        ],
        premiado: [
          {chave:'nome', desc:'Nome do integrante'},
          {chave:'nomeProjeto', desc:'Nome do projeto'},
          {chave:'categoria', desc:'Categoria do projeto'},
          {chave:'eixo', desc:'Eixo do projeto'},
          {chave:'colocacao', desc:'Colocação (1º, 2º, 3º lugar)'}
        ],
        mencao: [
          {chave:'nome', desc:'Nome do integrante'},
          {chave:'nomeProjeto', desc:'Nome do projeto'},
          {chave:'categoria', desc:'Categoria do projeto'},
          {chave:'eixo', desc:'Eixo do projeto'}
        ],
        saberes: [
          {chave:'responsavel', desc:'Nome do responsável/conferencista'},
          {chave:'titulo', desc:'Título da apresentação'},
          {chave:'data', desc:'Data(s) do evento'},
          {chave:'tipo', desc:'Tipo do evento'},
          {chave:'cargaHoraria', desc:'Carga horária'}
        ],
        poficinas: [
          {chave:'nome', desc:'Nome do participante'},
          {chave:'eventos', desc:'Nome da(s) oficina(s)'},
          {chave:'data', desc:'Data(s) do evento'},
          {chave:'cargaHoraria', desc:'Carga horária total'}
        ],
        roficinas: [
          {chave:'responsavel', desc:'Nome do responsável pela oficina'},
          {chave:'titulo', desc:'Título da oficina'},
          {chave:'data', desc:'Data(s) do evento'},
          {chave:'tipo', desc:'Tipo do evento'},
          {chave:'cargaHoraria', desc:'Carga horária'}
        ],
        academica: [
          {chave:'responsavel', desc:'Nome do responsável/conferencista'},
          {chave:'titulo', desc:'Título da apresentação'},
          {chave:'data', desc:'Data(s) do evento'},
          {chave:'tipo', desc:'Tipo do evento'},
          {chave:'cargaHoraria', desc:'Carga horária'}
        ],
        docentes: [
          {chave:'nome', desc:'Nome do participante'},
          {chave:'eventos', desc:'Descrição da participação'},
          {chave:'data', desc:'Data(s) do evento'},
          {chave:'cargaHoraria', desc:'Carga horária'},
          {chave:'percentual', desc:'Percentual de frequência (número, sem símbolo %)'}
        ],
        ppalestra: [
          {chave:'nome', desc:'Nome do participante'},
          {chave:'eventos', desc:'Nome da(s) palestra(s)'},
          {chave:'titulo', desc:'Nome da(s) palestra(s)'},
          {chave:'data', desc:'Data(s) do evento'},
          {chave:'tipo', desc:'Tipo do evento'},
          {chave:'cargaHoraria', desc:'Carga horária total'}
        ],
        rpalestra: [
          {chave:'responsavel', desc:'Nome do(a) palestrante'},
          {chave:'titulo', desc:'Título da palestra'},
          {chave:'data', desc:'Data(s) do evento'},
          {chave:'tipo', desc:'Tipo do evento'},
          {chave:'cargaHoraria', desc:'Carga horária'}
        ]
      };

      // Imagens já cadastradas pro ano selecionado (vêm prontas em base64 do banco,
      // então dá pra usar direto como miniatura) e prévia de um arquivo novo recém
      // escolhido, antes de salvar.
      $scope.imagemExistente = null;
      $scope.imagemFundoExistente = null;
      $scope.previewImagem = null;
      $scope.previewImagemNome = null;
      $scope.previewImagemFundo = null;
      $scope.previewImagemFundoNome = null;

      //carregaDado explicacao
      //
      // Se o ano selecionado não tem certificado cadastrado, os campos (textos e imagens)
      // mantêm o que já estava preenchido em vez de limpar - de propósito, pra dar pra
      // duplicar as informações de um ano pro outro alterando só o que precisa. Por isso
      // as imagens não são zeradas aqui: só são sobrescritas dentro do "if" quando existe
      // mesmo um certificado pro ano, igual já acontecia com os campos de texto.
      $scope.carregaDado = function (mostraId) {
        var c = $scope.certificadoDaMostra(mostraId);
        if (c) {
             $scope.textocertificado_avaliador = c.textoAvaliador;
             $scope.textocertificado_orientador = c.textoOrientador;
             $scope.textocertificado_apresentacao = c.textoApresentacao;
             $scope.textocertificado_premiado = c.textoPremiado;
             $scope.textocertificado_mencao = c.textoMencao;
             $scope.textocertificado_saberes = c.textoSaberes;
             $scope.textocertificado_poficinas = c.textoPOficinas;
             $scope.textocertificado_roficinas = c.textoROficinas;
             $scope.textocertificado_academica = c.textoAcademica;
             $scope.textocertificado_docentes = c.textoDocentes;
             $scope.textocertificado_ppalestra = c.textoPPalestra;
             $scope.textocertificado_rpalestra = c.textoRPalestra;
             $scope.imagemExistente = c.imagem;
             $scope.imagemFundoExistente = c.imagemFundo;
        }
      };

      var recarregarCertificados = function() {
        return adminAPI.getCertificado().then(function(response) { $scope.certificados = response.data || []; });
      };

      adminAPI.getCertificado().then(function(response){
        $scope.certificados = response.data;
        // Carrega automaticamente o certificado do ano padrão ao entrar na página, se já
        // existir um cadastrado - antes só carregava quando o usuário reselecionava o ano
        // manualmente no filtro (ng-change não dispara sozinho no primeiro carregamento).
        certificadosProntos = true;
        definirMostraPadrao();
      }, function(response) {
        console.log('Error: '+response.data);
        certificadosProntos = true;
        definirMostraPadrao();
      });

      // Mostra uma prévia da imagem assim que o usuário escolhe um arquivo novo, antes de
      // salvar - chamado direto pelo onchange do <input type="file"> (ver cadastro-mostra.html).
      $scope.previewFile = function(input, tipo) {
        var file = input.files && input.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function(e) {
          $scope.$apply(function() {
            if (tipo === 'principal') {
              $scope.previewImagem = e.target.result;
              $scope.previewImagemNome = file.name;
            } else {
              $scope.previewImagemFundo = e.target.result;
              $scope.previewImagemFundoNome = file.name;
            }
          });
        };
        reader.readAsDataURL(file);
      };

      //função que é ativada ao se clicar no botão CADASTRAR na página cadastro-mostra.html
      $scope.cadastrarMostra = function(){

        var Imagem = document.getElementById('imagem').files[0];
        var Imagem2 = document.getElementById('imagem2').files[0];

        var lerComoDataUrl = function(file, callback) {
          var reader = new FileReader();
          reader.onloadend = function(){ callback(reader.result); };
          reader.readAsDataURL(file);
        };

        var enviar = function(dataUrl, dataUrlFundo) {
          //preenche o JSON de dados com as informações do certificado
          var dados = {
            'dataUrl' : dataUrl,
            'dataUrlFundo' : dataUrlFundo,
            'textoAvaliador' : $scope.textocertificado_avaliador,
            'textoOrientador' : $scope.textocertificado_orientador,
            'textoApresentacao' : $scope.textocertificado_apresentacao,
            'textoPremiado' : $scope.textocertificado_premiado,
            'textoMencao' : $scope.textocertificado_mencao,
            'textoSaberes' : $scope.textocertificado_saberes,
            'textoPOficinas' : $scope.textocertificado_poficinas,
            'textoROficinas' : $scope.textocertificado_roficinas,
            'textoAcademica' : $scope.textocertificado_academica,
            'textoDocentes' : $scope.textocertificado_docentes,
            'textoPPalestra' : $scope.textocertificado_ppalestra,
            'textoRPalestra' : $scope.textocertificado_rpalestra,
            'feiraId' : $scope.mostraId
          };

          //chama o método postCertificado da adminAPI passando as informações do certificado e ativa um método de callback CASO o request retorne 200 ou 'success'
          adminAPI.postCertificado(dados)
          .then(function(){
            alert('Certificado da ' + (($scope.mostraDe($scope.mostraId) || {}).nome || 'Mostra') + ' salvo.');
            recarregarCertificados();
          }, function(response) {
            console.log('Error: '+response.data);
          });
        };

        // Se o usuário não escolheu um arquivo novo pra alguma das duas imagens, mantém a
        // imagem já cadastrada pro ano (antes tinha que reenviar as duas sempre, mesmo pra
        // só atualizar os textos - sem escolher nenhum arquivo, a tela travava tentando ler
        // um arquivo inexistente).
        if (Imagem && Imagem2) {
          lerComoDataUrl(Imagem, function(url1){
            lerComoDataUrl(Imagem2, function(url2){
              enviar(url1, url2);
            });
          });
        } else if (Imagem) {
          lerComoDataUrl(Imagem, function(url1){
            enviar(url1, $scope.imagemFundoExistente);
          });
        } else if (Imagem2) {
          lerComoDataUrl(Imagem2, function(url2){
            enviar($scope.imagemExistente, url2);
          });
        } else {
          enviar($scope.imagemExistente, $scope.imagemFundoExistente);
        }
      };
    }
  )
})();
