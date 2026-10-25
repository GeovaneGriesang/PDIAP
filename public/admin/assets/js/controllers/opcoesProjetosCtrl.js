(function(){
	'use strict';

	// Mostra > Campos editáveis: o que os integrantes podem alterar no projeto pelo "Meu painel",
	// POR MOSTRA (cada edição tem os seus - ver controllers/opcoes-projetos-controller.js). A Mostra
	// escolhida é a mesma das outras telas do admin ($rootScope.mostraId).
	angular
	.module('PDIAPa')
	.controller('opcoesProjetosCtrl', function($scope, $rootScope, $timeout, adminAPI) {

		$scope.opcoes = {};
		$scope.mostras = [];

		$scope.carregarOpcoes = function() {
			if (!$rootScope.mostraId) return;
			adminAPI.getOpcoes($rootScope.mostraId).then(function(response) {
				$scope.opcoes = response.data || {};
			}, function(response) {
				$scope.toast(typeof response.data === 'string' && response.data ? response.data : 'Não foi possível carregar os campos editáveis.', 'failed-toast');
			});
		};
		$scope.recarregar = $scope.carregarOpcoes;

		$scope.nomeMostra = function() {
			var m = $scope.mostras.filter(function(x) { return x._id === $rootScope.mostraId; })[0];
			return m ? m.ano + ' - ' + m.nome : '';
		};

		adminAPI.getMostras().then(function(response) {
			$scope.mostras = response.data || [];
			$timeout(function() {
				if (!$rootScope.mostraId && $scope.mostras.length) $rootScope.mostraId = $scope.mostras[0]._id;
				$scope.carregarOpcoes();
			});
		}, function() {});

		$scope.atualizarOpcoes = function(opcoes) {
			adminAPI.postOpcoes($rootScope.mostraId, opcoes).then(function() {
				$scope.toast('Campos editáveis da Mostra ' + $scope.nomeMostra() + ' salvos!', 'success-toast');
				$scope.carregarOpcoes();
			}, function(response) {
				$scope.toast(typeof response.data === 'string' && response.data ? response.data : 'Falha ao salvar.', 'failed-toast');
			});
		};
	});
})();
