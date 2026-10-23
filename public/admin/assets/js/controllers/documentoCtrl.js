//Mateus Roberto Algayer - 01/10/2021
(function(){
    'use strict';
    angular
    .module('PDIAPa')
    .controller('documentoCtrl', function($scope, $rootScope, $timeout, $mdDialog, $http, adminAPI) {

        // Cada documento é de UMA Mostra (não do ano todo - pode haver duas Mostras no mesmo ano):
        // os seletores listam cada Mostra separada. A Mostra padrão é a das outras telas
        // ($rootScope.mostraId) ou a mais recente.
        $scope.mostras = [];
        $scope.titulo_documento = "";
        $scope.form = { mostraId: null };
        $scope.filtro = { mostraId: null };
        // O <md-select>+ng-repeat de Mostras, ao ser preenchido de forma assíncrona, religa cada
        // <md-option> e reescreve o ng-model no processo (bug conhecido do Angular Material) - por
        // isso só define a Mostra padrão depois que a lista chegar.
        adminAPI.getMostras()
        .then(function(response) {
            $scope.mostras = (response.data || []).filter(function(m) { return m.tipo === 'edicao'; })
                .sort(function(a, b) { return (b.ano - a.ano) || (String(a._id) < String(b._id) ? 1 : -1); });
            $timeout(function() {
                var existe = $scope.mostras.some(function(m) { return m._id === $rootScope.mostraId; });
                var padrao = existe ? $rootScope.mostraId : ($scope.mostras.length ? $scope.mostras[0]._id : null);
                $scope.form.mostraId = padrao;
                $scope.filtro.mostraId = padrao;
            });
        }, function(response) { console.log('Error: '+response.data); });
        $scope.mostraDe = function(id) { return $scope.mostras.filter(function(m) { return m._id === id; })[0]; };
        // Lista da Mostra escolhida + documentos antigos sem Mostra do mesmo ano (pra definir a Mostra).
        $scope.daMostra = function(info) {
            var m = $scope.mostraDe($scope.filtro.mostraId);
            if (!m) return false;
            return info.feiraId ? info.feiraId === m._id : info.ano === m.ano;
        };
        $scope.Exibe_documento = false;
        $scope.documentos = [];
        $scope.spinnerActive = false; // Controle do carregamento

        // Busca documentos do servidor de forma otimizada
        $scope.carregarDocumentos = function() {
            $scope.spinnerActive = true;
            adminAPI.getDocumentos()
            .then(function(response){
                var documentos = response.data;
                if(documentos && documentos.length > 0){
                    // Clonamos o array sem criar vínculos pesados de escopo no Angular
                    $scope.documentos = angular.copy(documentos);
                }
                $scope.spinnerActive = false;
            }, function(response) {
                console.error("Erro ao buscar documentos:", response.data);
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
                    "feiraId": $scope.form.mostraId,
                    "exibe": $scope.Exibe_documento
                };

                adminAPI.postDocumento(pacote)
                .then(function(){
                    $scope.spinnerActive = false;
                    window.location.reload();
                }, function() {
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
                .then(function() {
                    if (typeof $scope.toast === 'function') { $scope.toast('Documento removido!', 'success-toast'); }
                    window.location.reload();
                }, function(response) {
                    console.error("Erro ao remover documento:", response.data);
                });
            });
        };

        $scope.UpdateExibir = function(id, exibe){
            adminAPI.putUpdateExibir(id, exibe);
        };

        // Muda a Mostra de um documento (os antigos só tinham o ano).
        $scope.mudarMostra = function(info) {
            $http.put('/admin/documentos/' + info._id + '/mostra', { feiraId: info.novaMostra }).then(function(response) {
                info.feiraId = response.data.feiraId;
                info.ano = response.data.ano;
                info.novaMostra = null;
                if (typeof $scope.toast === 'function') { $scope.toast('Documento movido para ' + $scope.nomeMostra(info.feiraId) + '.', 'success-toast'); }
            }, function(response) {
                if (typeof $scope.toast === 'function') { $scope.toast(typeof response.data === 'string' && response.data ? response.data : 'Falha ao salvar.', 'failed-toast'); }
            });
        };
        $scope.nomeMostra = function(id) { var m = $scope.mostraDe(id); return m ? m.ano + ' - ' + m.nome : '-'; };

        // Visualizar/baixar: o arquivo vem do servidor só agora (a lista não traz os arquivos).
        // PDF abre no quadro abaixo; Word/PowerPoint baixam.
        $scope.Visualiza = function(info){
            var url = '/admin/documentos/' + info._id + '/arquivo';
            var preview = document.getElementById('visualizaPdf');
            if (preview) preview.src = url;
            return true;
        };
    });
})();