(function(){
    'use strict';
    angular
    .module('PDIAPa')
    .controller('documentoCtrl', function($scope, adminAPI) {

        $scope.exibeDocumentos = false;

        //declaração das scopes da tela
        $scope.year = CadastraAno();
        $scope.titulo_documento;
        $scope.ano;
        $scope.Exibe_documento;

        $scope.documento = [];

        //declaração de uma função que ativa ao pressionar o botão "Cadastrar"
        $scope.CadastraDocumento = function(){
            
            let pdf = new FileReader();
            let arquivo = document.getElementById('pdf_documento').files[0];
            //isso aqui ativa quando ele termina de carregar o pdf em base64
            pdf.onloadend = () =>{

                let indice = 1;
                let id = 0;
                let continua = true;
                
                //itera até encontrar um identificador válido
                while(continua){
                    //caso lista vazia ou chegar ao fim da lista ele ativa esse if
                    if(typeof $scope.documento[indice-1] === "undefined"){
                        id = indice;
                        continua = false;
                    }else if(indice != $scope.documento[indice-1].id){ //esse if serve para reutilizar números que em teoria seriam "pulados"
                        id = indice;
                        continua = false;
                    } else {
                        indice++;
                    }
                }

                let json = {
                        "id": id,
                        "pdf": pdf.result,
                        "titulo": $scope.titulo_documento,
                        "ano": $scope.ano,
                        "Exibe": $scope.Exibe_documento
                };
                
                $scope.documento.push(json);
                console.log(json);
                console.log($scope.documento);
                $scope.exibeDocumentos = true;
            }

            pdf.readAsDataURL(arquivo);
        }
    }
  )
})();