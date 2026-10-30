(function(){
	'use strict';

	// Sistema > Auditoria (só super-admin): alterações feitas no admin e no Meu painel, mais recentes
	// primeiro (GET /admin/auditoria - utils/auditoria.js). Registro só a partir de 29/10/2026.
	angular
	.module('PDIAPa')
	.controller('auditoriaCtrl', function($scope, $http, $mdToast) {

		$scope.toast = function(message,tema) {
			var toast = $mdToast.simple().textContent(message).action('✖').position('top right').theme(tema).hideDelay(10000);
			$mdToast.show(toast);
		};

		$scope.filtro = { texto: '', de: null, ate: null, erros: false };
		$scope.dados = { itens: [], total: 0, pagina: 0, porPagina: 50 };
		$scope.carregando = false;
		$scope.aberto = {};

		var dia = function(d) { return d ? d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2) : undefined; };

		$scope.carregar = function(pagina) {
			$scope.carregando = true;
			$http.get('/admin/auditoria', { params: {
				texto: $scope.filtro.texto || undefined, de: dia($scope.filtro.de), ate: dia($scope.filtro.ate),
				erros: $scope.filtro.erros ? 'true' : undefined, pagina: pagina || 0
			} }).then(function(response) {
				$scope.dados = response.data;
			}, function(response) {
				$scope.toast(typeof response.data === 'string' && response.data ? response.data : 'Falha ao carregar.', 'failed-toast');
			}).finally(function() { $scope.carregando = false; });
		};
		$scope.carregar(0);

		$scope.paginas = function() { return Math.max(1, Math.ceil($scope.dados.total / $scope.dados.porPagina)); };
		$scope.alternar = function(a) { $scope.aberto[a._id] = !$scope.aberto[a._id]; };
		$scope.deuErro = function(a) { return a.status >= 400; };
	});
})();
