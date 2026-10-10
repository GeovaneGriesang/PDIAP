(function(){
	'use strict';

	// Tela "Pessoas": busca no cadastro único e mostra os perfis da pessoa em cada Mostra
	// (derivados dos vínculos, nunca gravados - ver controllers/perfis-controller.js).
	angular
	.module('PDIAPa')
	.controller('pessoasCtrl', function($scope, $mdToast, adminAPI) {

		$scope.toast = function(message,tema) {
			var toast = $mdToast.simple().textContent(message).action('✖').position('top right').theme(tema).hideDelay(10000);
			$mdToast.show(toast);
		};

		$scope.busca = { q: '' };
		$scope.resultados = [];
		$scope.buscou = false;
		$scope.perfil = null;

		var NACIONALIDADES = { brasileiro: 'Brasileiro(a)', paraguaio: 'Paraguaio(a)', uruguaio: 'Uruguaio(a)', venezuelano: 'Venezuelano(a)', outro: 'Outra nacionalidade' };
		$scope.nomeNacionalidade = function(n) { return NACIONALIDADES[n] || n || '-'; };

		$scope.pesquisar = function() {
			var q = ($scope.busca.q || '').trim();
			$scope.perfil = null;
			if (q.length < 3) { $scope.resultados = []; $scope.buscou = false; return; }
			adminAPI.pesquisarPessoas(q)
			.then(function(response) {
				$scope.resultados = response.data || [];
				$scope.buscou = true;
			}, function(response) {
				$scope.toast(response.data || 'Falha.','failed-toast');
			});
		};

		// Também aceita um documento digitado direto (pessoa antiga, ainda sem cadastro único,
		// só nos registros de projeto/avaliação).
		$scope.verPerfis = function(documento) {
			adminAPI.getPerfisPessoa(documento)
			.then(function(response) {
				$scope.perfil = response.data;
			}, function(response) {
				$scope.toast(response.data || 'Falha.','failed-toast');
			});
		};

		$scope.voltar = function() {
			$scope.perfil = null;
		};
	});
})();
