//controlador responsável por exportar os projetos para o ifpublica
(function(){
    'use strict';
  
    //inclusão do controlador dentro do módulo PDIAPa do Angular
    angular
    .module('PDIAPa')
    .controller('ExportarCtrl', function($scope, adminAPI) {

      //variáveis de usuario e senha
      $scope.exportuser;
      $scope.exportpassword;
      $scope.msg = true;
      $scope.codigo = 'aaaaaaaa';
      $scope.year = CadastraAno();

      //função que é ativada por clique na página exportar.html 
      $scope.ExportarProjetos = function(){

        //função responsável por criar a conexão entre servidores
        adminAPI.exportaProjetos($scope.exportuser, $scope.exportpassword);
        
      }
  })
})();

