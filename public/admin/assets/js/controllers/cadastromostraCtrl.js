(function(){
    'use strict';
    angular
    .module('PDIAPa')
    .controller('cadastromostraCtrl', function($scope, adminAPI) {

      $scope.layout_certificado;
      $scope.textocertificado_aluno;
      $scope.textocertificado_orientador;
      $scope.textocertificado_saberes;
      $scope.textocertificado_premiado;
      $scope.textocertificado_participante;
      $scope.textocertificado_mencao;
      $scope.textocertificado_semana;
        
      $scope.cadastrarMostra = function(){

        var LerImagem = new FileReader();
        var Imagem = document.querySelector('input[type=file]').files[0];
        var preview = document.getElementById('preview_img');
        
        LerImagem.onloadend = function(){
          
          preview.src = LerImagem.result;

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

          adminAPI.postCertificado(dados)
          .success(function(){

            alert('Sucesso!!'); 

          });
        }

        LerImagem.readAsDataURL(Imagem);

      };
    }
  )
})();