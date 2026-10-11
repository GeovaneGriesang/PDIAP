(function(){
	'use strict';

	// Definir (primeiro acesso) ou trocar a senha estando logado(a) no painel único - tela
	// painel-trocar-senha.html. Recuperação por link de e-mail é do contaSenhaCtrl.
	angular
	.module('PDIAP')
	.controller('painelSenhaCtrl', function($scope, $rootScope, $window, contaAPI) {

		// Template compartilhado com o fluxo antigo: sem token nem "esqueci a senha" aqui.
		$scope.modoToken = false;
		$scope.modoEsqueciSenha = false;
		$scope.modoTrocaLogado = true;

		// Só pede "senha atual" quando já existe uma senha própria (troca voluntária) - no
		// primeiro acesso a "senha" usada pra entrar foi o documento de identificação.
		$scope.exigeSenhaAtual = !!($rootScope.pessoaLogada && $rootScope.pessoaLogada.senhaDefinida);

		$scope.senha = {};
		$scope.enviado = false;
		$scope.mensagemErro = '';

		$scope.salvar = function() {
			$scope.mensagemErro = '';
			contaAPI.trocarSenha($scope.senha.atual, $scope.senha.nova)
			.then(function() {
				$window.location.href = '/painel';
			}, function(response) {
				$scope.mensagemErro = typeof response.data === 'string' && response.data ? response.data : 'Não foi possível trocar a senha.';
			});
		};
	});
})();
