(function(){
    'use strict';
    angular
    .module('PDIAPa')
    .controller('cadastromostraCtrl', function($scope, adminAPI) {

      //algumas scopes para recuperar os dados 
      $scope.layout_certificado;
      $scope.textocertificado_aluno;
      $scope.textocertificado_orientador;
      $scope.textocertificado_saberes;
      $scope.textocertificado_premiado;
      $scope.textocertificado_participante;
      $scope.textocertificado_mencao;
      $scope.textocertificado_semana;
      
      //função que é ativada ao se clicar no botão CADASTRAR na página cadastro-mostra.html 
      $scope.cadastrarMostra = function(){

        var LerImagem = new FileReader();
        var Imagem = document.querySelector('input[type=file]').files[0];
        var preview = document.getElementById('preview_img');
        
        //essa função é ativada quando o método readAsDataURL do FileReader terminar de carregar a imagem do certificado como base 64
        LerImagem.onloadend = function(){
          
          //gera um preview da imagem na página cadastro-mostra.html 
          preview.src = LerImagem.result;

          //preenche o JSON de dados com as informações do certificado
          var dados = {
            'dataUrl' : LerImagem.result,
            'textoAluno' : $scope.textocertificado_aluno,
            'textoOrientador' : $scope.textocertificado_orientador,
            'textoSaberes' : $scope.textocertificado_saberes,
            'textoPremiado' : $scope.textocertificado_premiado,
            'textoParticipante' : $scope.textocertificado_participante,
            'textoMencao' : $scope.textocertificado_mencao,
            'textoSemana' : $scope.textocertificado_semana, 
          };

          //chama o método postCertificado da adminAPI passando as informações do certificado e ativa um método de callback CASO o request retorne 200 ou 'success'
          adminAPI.postCertificado(dados)
          .success(function(){

            alert('Sucesso!!'); 

          });
        }

        // usa um método do FileReader pra ler a imagem do certificado como base64
        LerImagem.readAsDataURL(Imagem);

      };
    }
  )
})();