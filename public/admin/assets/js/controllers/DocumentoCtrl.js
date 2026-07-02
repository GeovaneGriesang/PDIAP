//Mateus Roberto Algayer - 01/10/2021
(function(){
    'use strict';
    angular
    .module('PDIAPa')
    .controller('documentoCtrl', function($scope, $mdDialog, adminAPI) {

        // Declaração e inicialização segura das scopes
        $scope.year = typeof CadastraAno === 'function' ? CadastraAno() : [new Date().getFullYear()];
        $scope.titulo_documento = "";
        $scope.ano = $scope.year[0];
        $scope.Exibe_documento = false;
        $scope.documentos = [];
        $scope.spinnerActive = false; // Controle do carregamento

        // Busca documentos do servidor de forma otimizada
        $scope.carregarDocumentos = function() {
            $scope.spinnerActive = true;
            adminAPI.getDocumentos()
            .success(function(documentos){
                if(documentos && documentos.length > 0){
                    // Clonamos o array sem criar vínculos pesados de escopo no Angular
                    $scope.documentos = angular.copy(documentos);
                }
                $scope.spinnerActive = false;
            })
            .error(function(err) {
                console.error("Erro ao buscar documentos:", err);
                $scope.spinnerActive = false;
            });
        };

        // Executa a busca inicial
        $scope.carregarDocumentos();

        // Função auxiliar exigida pelo seu HTML antigo
        $scope.exibeDocumentos = function(){
            return $scope.documentos && $scope.documentos.length > 0;
        };

        // Cadastro de arquivo (PDF, DOC e DOCX)
        $scope.CadastraDocumento = function(){
            let inputElement = document.getElementById('pdf_documento');
            
            if (!inputElement || !inputElement.files || inputElement.files.length === 0) {
                if (typeof $scope.toast === 'function') { $scope.toast('Selecione um arquivo válido!', 'failed-toast'); }
                return;
            }

            $scope.spinnerActive = true;
            let arquivo = inputElement.files[0];
            let leitor = new FileReader();
            
            leitor.onloadend = () => {
                let pacote = {
                    "pdf": leitor.result, // String Base64 do PDF ou Word
                    "titulo": $scope.titulo_documento,
                    "ano": $scope.ano,
                    "exibe": $scope.Exibe_documento
                };

                adminAPI.postDocumento(pacote)
                .success(function(_){
                    $scope.spinnerActive = false;
                    window.location.reload();
                })
                .error(function() {
                    $scope.spinnerActive = false;
                    if (typeof $scope.toast === 'function') { $scope.toast('Erro ao cadastrar.', 'failed-toast'); }
                });
            };
            leitor.readAsDataURL(arquivo);
        };
        
        // Remoção de documento
        $scope.RemoveDocumento = function(ev, titulo, id){
            var confirm = $mdDialog.confirm()
            .textContent('Deseja remover o documento ' + titulo + '?')
            .ariaLabel('Remover documento')
            .targetEvent(ev)
            .ok('Sim')
            .cancel('Não');
            
            $mdDialog.show(confirm).then(function() {
                adminAPI.removeDocumento(id)
                .success(function() {
                    if (typeof $scope.toast === 'function') { $scope.toast('Documento removido!', 'success-toast'); }
                    window.location.reload();
                });
            });
        };

        $scope.UpdateExibir = function(id, exibe){
            adminAPI.putUpdateExibir(id, exibe);
        };

        // Visualização sob demanda (não trava a página)
        $scope.Visualiza = function(fileBase64, tituloDoc){
            if(!fileBase64 || fileBase64 === '') return false;
            
            // Se for PDF, renderiza no iframe
            if (fileBase64.startsWith("data:application/pdf")) {
                var preview = document.getElementById("visualizaPdf");
                if (preview) {
                    preview.src = fileBase64;
                    return true;
                }
            } 
            
            // Se for Word (.doc/.docx), força o download imediato para aliviar a RAM
            var link = document.createElement('a');
            link.href = fileBase64;
            
            var extensao = fileBase64.includes("officedocument.wordprocessingml") ? ".docx" : ".pdf";
            if(fileBase64.includes("msword")) { extensao = ".doc"; }
            
            link.download = (tituloDoc || "documento") + extensao;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            return true;
        };
    });
})();