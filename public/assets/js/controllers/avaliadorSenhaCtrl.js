(function(){
	'use strict';

	angular
	.module('PDIAP')
	.controller('avaliadorSenhaCtrl', function($scope, $rootScope, $state, $stateParams, $window, avaliadorAPI) {

		// Esse controller atende 3 telas parecidas (definir/trocar senha estando logado,
		// trocar senha via link de e-mail com token, e pedir o link de recuperação) -
		// decide qual pelo nome do estado atual, ver ui-routes.js.
		$scope.modoToken = $state.current.name === 'avaliadorNovaSenha';
		$scope.modoEsqueciSenha = $state.current.name === 'avaliadorEsqueciSenha';
		$scope.modoTrocaLogado = !$scope.modoToken && !$scope.modoEsqueciSenha;

		// Só pede "senha atual" quando já existe uma senha própria definida (troca
		// voluntária) - no primeiro acesso (senhaDefinida false) pula direto pra escolher
		// a nova senha, já que a "senha" usada pra logar foi o documento de identificação.
		$scope.exigeSenhaAtual = $scope.modoTrocaLogado && $rootScope.avaliadorLogado && $rootScope.avaliadorLogado.senhaDefinida;

		$scope.senha = {};
		$scope.enviado = false;
		$scope.mensagemErro = '';

		$scope.pedirRecuperacao = function() {
			$scope.mensagemErro = '';
			avaliadorAPI.redefinirSenha($scope.senha.email)
			.success(function() {
				$scope.enviado = true;
			})
			.error(function(status) {
				$scope.mensagemErro = 'Não encontramos esse e-mail cadastrado.';
			});
		};

		$scope.salvar = function() {
			$scope.mensagemErro = '';

			if ($scope.modoToken) {
				avaliadorAPI.novaSenhaComToken($stateParams.token, $scope.senha.nova)
				.success(function(data) {
					if (data === 'Senha alterada') {
						$window.location.href = '/avaliadores/dashboard';
					} else {
						$scope.mensagemErro = 'Esse link não é mais válido. Peça uma nova recuperação de senha.';
					}
				})
				.error(function(status) {
					$scope.mensagemErro = typeof status === 'string' ? status : 'Não foi possível trocar a senha.';
				});
				return;
			}

			avaliadorAPI.trocarSenha($scope.senha.atual, $scope.senha.nova)
			.success(function() {
				$window.location.href = '/avaliadores/dashboard';
			})
			.error(function(status) {
				$scope.mensagemErro = typeof status === 'string' ? status : 'Não foi possível trocar a senha.';
			});
		};
	});
})();
