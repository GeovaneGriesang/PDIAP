(function(){
	'use strict';

	angular
	.module('PDIAP')
	.controller('homeCtrl', function($scope, $rootScope, $location, $mdDialog, $interval, projetosAPI, certificadosService) {

		projetosAPI.getDocumentos().then(function(response){
			var documentos = response.data;
			$scope.documentos = documentos;

			$scope.ExibeDocumentos = documentos.length > 0;
		}, function(response) {
			console.log('Error: ' + response.data);
		});

		// Carrossel da galeria "Edições Anteriores" (imagens injetadas pelo servidor,
		// ver views/layout2.ejs e routes/index.js).
		$scope.galeriaImagens = window.__GALERIA_IMAGENS__ || [];
		$scope.galeriaSlideAtual = 0;

		$scope.galeriaProxima = function() {
			$scope.galeriaSlideAtual = ($scope.galeriaSlideAtual + 1) % $scope.galeriaImagens.length;
		};
		$scope.galeriaAnterior = function() {
			$scope.galeriaSlideAtual = ($scope.galeriaSlideAtual - 1 + $scope.galeriaImagens.length) % $scope.galeriaImagens.length;
		};
		$scope.galeriaIrPara = function(index) {
			$scope.galeriaSlideAtual = index;
		};

		if ($scope.galeriaImagens.length > 1) {
			var galeriaAutoPlay = $interval($scope.galeriaProxima, 5000);
			$scope.$on('$destroy', function() {
				$interval.cancel(galeriaAutoPlay);
			});
		}

		$scope.edits = [];

		$scope.carregarEdits = function(){
			projetosAPI.getEdits().then(function(response){
				$scope.edits = response.data;
			}, function(response) {
				console.log(response.data);
			});
		}
		$scope.carregarEdits();

		// Mostras (Fase 2, ver memória project-mostra-ano-nao-unico): substitui o link
		// único e fixo de "Cadastrar projeto"/"Cadastrar avaliador" (antes controlado só
		// pelo prazo global do singleton Admin, ver edits[0] acima) por um botão POR
		// edição com inscrição aberta, cada um com seu próprio link (/inscricao/:slug) e
		// texto de prazo - permite duas Mostras em paralelo com prazos diferentes.
		$scope.edicoes = [];
		$scope.carregarEdicoes = function(){
			projetosAPI.getEdicoesInscricao().then(function(response){
				$scope.edicoes = response.data || [];
			}, function(response) {
				console.log(response.data);
			});
		}
		$scope.carregarEdicoes();

		// Usado em layout2.ejs pra decidir se mostra "Nenhum botão disponível" no menu
		// (antes checava só edits[0].cadastro_projetos/cadastro_avaliadores - agora
		// verifica se ALGUMA edição tem projetos ou avaliadores com inscrição aberta).
		$scope.algumaInscricaoAberta = function() {
			return ($scope.edicoes || []).some(function(e) {
				return (e.projetos && e.projetos.aberto) || (e.avaliadores && e.avaliadores.aberto);
			});
		};

		$scope.showLoginDialog = function(ev) {
			$mdDialog.show({
				// controller: () => this,
				templateUrl: '/views/login.html',
				parent: angular.element(document.body),
				targetEvent: ev,
				clickOutsideToClose: true
			});
		};

		$scope.showEmitCertificate = function(ev) {
			var confirm = $mdDialog.prompt()
			.title('Insira seu CPF')
			.placeholder('CPF')
			.ariaLabel('CPF')
			.targetEvent(ev)
			.ok('Buscar')
			.cancel('Fechar');
			$mdDialog.show(confirm).then(function(result) {
				certificadosService.buscarPorDocumento(result);
			}, function() {});
		};
	});
})();
