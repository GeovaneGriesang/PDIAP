//Mateus Roberto Algayer - 01/10/2021
(function(){
    'use strict';
    angular
    .module('PDIAPa')
    .controller('documentoCtrl', function($scope, $mdDialog, adminAPI) {

        //declaração das scopes da tela
        $scope.year = CadastraAno();
        $scope.titulo_documento;
        $scope.ano;
        $scope.Exibe_documento;

        //Leandro Henrique Kopp Ferreira - 14/10/2021
        adminAPI.getDocumentos()
        .success(function(documentos){

            $scope.exibeDocumentos = function(){
                if(documentos.length <= 0){return false;}

                $scope.documentos = [];

                for(i=0; i<documentos.length; i++){
                    $scope.documentos.push(documentos[i]);
                }

                return true;
            }
        });

        //declaração de uma função que ativa ao pressionar o botão "Cadastrar"
        $scope.CadastraDocumento = function(){
            
            let pdf = new FileReader();
            let arquivo = document.getElementById('pdf_documento').files[0];
            //isso aqui ativa quando ele termina de carregar o pdf em base64
            pdf.onloadend = () =>{
                //cria um pacote com as informações do formulário
                let pacote = {
                    "pdf": pdf.result,
                    "titulo": $scope.titulo_documento,
                    "ano": $scope.ano,
                    "exibe": $scope.Exibe_documento
                };

                //mandar o documento cadastrado para o express
                adminAPI.postDocumento(pacote).success(function(_){
                    window.location.reload();
                });
            }
            pdf.readAsDataURL(arquivo);
        }
        
        //Mateus Roberto Algayer - 16/11/2021
        $scope.RemoveDocumento = function(ev, titulo, id){
            var confirm = $mdDialog.confirm()
			.textContent('Deseja remover o documento '+titulo+'?')
			.ariaLabel('Remover documento')
			.targetEvent(ev)
			.ok('Sim')
			.cancel('Não');
			$mdDialog.show(confirm).then(function() {
				adminAPI.removeDocumento(id)
				.success(function() {
					$scope.toast('Documento removido com sucesso!','success-toast');
                    window.location.reload();
				})
				.error(function(status) {
					$scope.toast('Falha.','failed-toast');
					console.log("Error: "+status);
				});
			}, function() {});
        }

        //Mateus Roberto Algayer - 24/11/2021
        $scope.UpdateExibir = function(id, exibe){
            adminAPI.putUpdateExibir(id, exibe);
        }

        //Mateus Roberto Algayer - 07/12/2021
        $scope.Visualiza = function(pdf){
            if(pdf == ''){
                return false;
            }
            
            var preview = document.getElementById("visualizaPdf");
            preview.src = pdf;
            
            return true;
        }
    }
  )
})();