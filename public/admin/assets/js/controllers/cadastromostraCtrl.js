(function(){
    'use strict';
    angular
    .module('PDIAPa')
    .controller('cadastromostraCtrl', function($scope, adminAPI) {

      $scope.certificados = [];
      $scope.year = CadastraAno();

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
      $scope.carregaDado = function (ano) {
        $scope.imagemExistente = null;
        $scope.imagemFundoExistente = null;
        for (var i = 0; i < $scope.certificados.length; i++){
          if($scope.certificados[i].ano_certificado == ano){
             $scope.textocertificado_avaliador = $scope.certificados[i].textoAvaliador;
             $scope.textocertificado_orientador = $scope.certificados[i].textoOrientador;
             $scope.textocertificado_apresentacao = $scope.certificados[i].textoApresentacao;
             $scope.textocertificado_premiado = $scope.certificados[i].textoPremiado;
             $scope.textocertificado_mencao = $scope.certificados[i].textoMencao;
             $scope.textocertificado_saberes = $scope.certificados[i].textoSaberes;
             $scope.textocertificado_poficinas = $scope.certificados[i].textoPOficinas;
             $scope.textocertificado_roficinas = $scope.certificados[i].textoROficinas;
             $scope.textocertificado_academica = $scope.certificados[i].textoAcademica;
             $scope.textocertificado_docentes = $scope.certificados[i].textoDocentes;
             $scope.imagemExistente = $scope.certificados[i].imagem;
             $scope.imagemFundoExistente = $scope.certificados[i].imagemFundo;
          }
        }
      };

      $scope.confereCertificado = function(ano){
        for (var i = 0; i < $scope.certificados.length; i++){
          if($scope.certificados[i].ano_certificado == ano){
            return true;
          }
        }
        return false;
      };

      adminAPI.getCertificado().success(function(certificados){
        $scope.certificados = certificados;
        // Carrega automaticamente o certificado do ano atual ao entrar na página, se já
        // existir um cadastrado - antes só carregava quando o usuário reselecionava o ano
        // manualmente no filtro (ng-change não dispara sozinho no primeiro carregamento).
        $scope.ano = new Date().getFullYear();
        $scope.carregaDado($scope.ano);
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
            'ano_certificado' : $scope.ano
          };

          //chama o método postCertificado da adminAPI passando as informações do certificado e ativa um método de callback CASO o request retorne 200 ou 'success'
          adminAPI.postCertificado(dados)
          .success(function(){
            alert('Sucesso!!');
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
