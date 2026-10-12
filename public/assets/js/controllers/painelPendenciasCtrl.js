(function(){
	'use strict';

	// "Corrija seus dados" (painel-pendencias.html): pendências do próprio cadastro (nome completo,
	// documento, nacionalidade - ver utils/pendencias.js). Enquanto houver, o painel inteiro manda pra
	// cá (ui-routes.js#checkLoggedinPessoa) e o servidor recusa alterações e certificados pelo painel.
	angular
	.module('PDIAP')
	.controller('painelPendenciasCtrl', function($scope, $rootScope, $state, $window, $http, contaAPI) {

		var logado = $rootScope.pessoaLogada || {};
		$scope.nome = logado.nome;
		$scope.pendencias = logado.pendencias || [];
		if (!$scope.pendencias.length) { $state.go('painel'); return; }

		$scope.precisa = function(campo) {
			return $scope.pendencias.some(function(p) { return p.campo === campo; });
		};
		$scope.nacionalidades = [
			{ valor: 'brasileiro', nome: 'Brasileiro(a)' }, { valor: 'paraguaio', nome: 'Paraguaio(a)' },
			{ valor: 'uruguaio', nome: 'Uruguaio(a)' }, { valor: 'venezuelano', nome: 'Venezuelano(a)' },
			{ valor: 'outro', nome: 'Outra nacionalidade' }
		];
		$scope.dados = { nome: $scope.precisa('nome') ? (logado.nome || '') : undefined, nacionalidade: null, documento: '' };
		$scope.enviando = false;
		$scope.mensagemErro = '';

		$scope.salvar = function() {
			$scope.mensagemErro = '';
			$scope.enviando = true;
			contaAPI.corrigirPendencias($scope.dados)
			.then(function(response) {
				$scope.pendencias = response.data.pendencias || [];
				$rootScope.pessoaLogada.pendencias = $scope.pendencias;
				if (!$scope.pendencias.length) $window.location.href = '/painel';
			}, function(response) {
				$scope.mensagemErro = typeof response.data === 'string' && response.data ? response.data : 'Não foi possível salvar. Tente de novo.';
			})
			.finally(function() { $scope.enviando = false; });
		};

		$scope.logout = function() {
			$http.post('/logout').then(function() { $window.location.href = '/'; });
		};
	});
})();
