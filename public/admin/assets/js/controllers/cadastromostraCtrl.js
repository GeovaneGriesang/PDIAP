(function(){
    'use strict';
    angular
    .module('PDIAPa')
    .controller('cadastromostraCtrl', function($scope, adminAPI) {

      $scope.certificados = [];
      adminAPI.getCertificado().success(function(certificados){
        
        $scope.confereCertificado = function(ano){
          for(i = 0; i < certificados.length; i++){
            if(certificados[i].ano_certificado == ano){
              console.log('chegou aqui');
              return true;
            }
          }
          return false;
        }
      });
      

      // var CarregaCertificado = function(){
      //   var certificados = adminAPI.getCertificado();
      // }


      $scope.year = CadastraAno();

      //algumas scopes para recuperar os dados 
      $scope.layout_certificado;
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
      
      //função que é ativada ao se clicar no botão CADASTRAR na página cadastro-mostra.html 
      $scope.cadastrarMostra = function(){

        var LerImagem = new FileReader();
        var Imagem = document.getElementById('imagem').files[0];
        var preview = document.getElementById('preview_img');

        var LerImagem2 = new FileReader();
        var Imagem2 = document.getElementById('imagem2').files[0];
        var preview2 = document.getElementById('preview_img2');
        
        //essa função é ativada quando o método readAsDataURL do FileReader terminar de carregar a imagem do certificado como base 64
        LerImagem.onloadend = function(){
          
          //preenche o JSON de dados com as informações do certificado
          var dados = {
            'dataUrl' : LerImagem.result,
            'dataUrlFundo' : LerImagem2.result,
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

          // //chama o método postCertificado da adminAPI passando as informações do certificado e ativa um método de callback CASO o request retorne 200 ou 'success'
          adminAPI.postCertificado(dados)
          .success(function(){

            alert('Sucesso!!'); 

          });
        }

        // usa um método do FileReader pra ler a imagem do certificado como base64
        LerImagem2.readAsDataURL(Imagem2);
        LerImagem.readAsDataURL(Imagem);  
      };
    }
  )
})();