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
		// senão a Mostra acaba travada no último item da lista.
		//
		// mostraId (o _id da Feira) é a chave de seleção de verdade - $rootScope.ano fica só
		// como valor DERIVADO, porque pode haver mais de uma Mostra no mesmo ano (ver
		// memória project-mostra-ano-nao-unico). getHistoricoEmails continua filtrando por
		// ano puro no servidor (emailHistorico não tem feiraId ainda).
		let mostraIdPersistido = $rootScope.mostraId;
		let resolverMostraSelecionada = function() {
			$rootScope.mostraSelecionada = ($scope.mostras || []).filter(function(m) { return m._id === $rootScope.mostraId; })[0];
			$rootScope.ano = $rootScope.mostraSelecionada ? $rootScope.mostraSelecionada.ano : $rootScope.ano;
		};

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
				if (mostraIdPersistido) $rootScope.mostraId = mostraIdPersistido;
				else if (!$rootScope.mostraId && mostras.length) $rootScope.mostraId = mostras[0]._id;
				resolverMostraSelecionada();
				carregarHistorico();
			});
		})
		.error(function(status) {
			console.log('Error: '+status);
			resolverMostraSelecionada();
			carregarHistorico();
		});

		$scope.recarregar = function() {
			resolverMostraSelecionada();
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
