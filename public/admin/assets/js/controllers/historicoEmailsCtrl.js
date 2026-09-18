(function(){
	'use strict';

	// Mostra o histórico de e-mails em massa (Projetos, Avaliação x2, Participantes - ver
	// _registrarHistoricoEmail em routes/admin.js, chamado nas 4 rotas de envio), por ano.
	angular
	.module('PDIAPa')
	.controller('historicoEmailsCtrl', function($scope, $rootScope, $timeout, $mdDialog, adminAPI) {

		$scope.historico = [];
		$scope.mostras = [];

		// O <md-select>+ng-repeat de Mostras, ao ser preenchido de forma assíncrona (ver
		// adminAPI.getMostras() abaixo), religa cada <md-option> e reescreve o ng-model no
		// processo (bug conhecido do Angular Material com ng-repeat dentro de md-select) -
		// guarda o valor persistido ANTES e só carrega o histórico depois de reaplicá-lo,
		// senão o ano acaba travado no último item da lista.
		let anoPersistido = $rootScope.ano;

		var ORIGEM_LABEL = {
			projetos: 'Projetos', premiados: 'Premiados', avaliadores: 'Avaliadores', participantes: 'Participantes'
		};
		$scope.origemLabel = function(origem) {
			return ORIGEM_LABEL[origem] || origem;
		};

		let carregarHistorico = function() {
			$scope.historico = [];
			adminAPI.getHistoricoEmails($rootScope.ano)
			.success(function(historico) {
				$scope.historico = historico;
			})
			.error(function(status) {
				console.log(status);
			});
		};

		adminAPI.getMostras()
		.success(function(mostras) {
			$scope.mostras = mostras;
			$timeout(function() {
				$rootScope.ano = anoPersistido || new Date().getFullYear();
				carregarHistorico();
			});
		})
		.error(function(status) {
			console.log('Error: '+status);
			$rootScope.ano = anoPersistido || new Date().getFullYear();
			carregarHistorico();
		});

		$scope.recarregar = function() {
			carregarHistorico();
		};

		$scope.filtroOrigem = 'todos';
		$scope.query = 'assunto';
		$scope.setBusca = function(campo) {
			$scope.query = campo;
		};
		$scope.filtrarPorOrigem = function(item) {
			return $scope.filtroOrigem === 'todos' || item.origem === $scope.filtroOrigem;
		};

		$scope.verDetalhes = function(item, ev) {
			$mdDialog.show({
				targetEvent: ev,
				clickOutsideToClose: true,
				parent: angular.element(document.body),
				templateUrl: 'admin/views/details.historico-email.html',
				controller: function($scope, $mdDialog) {
					$scope.item = item;
					$scope.origemLabel = function(o) { return ORIGEM_LABEL[o] || o; };
					$scope.fechar = function() { $mdDialog.hide(); };
				}
			});
		};
	});
})();
