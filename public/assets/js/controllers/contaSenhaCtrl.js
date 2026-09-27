(function(){
	'use strict';

	angular
	.module('PDIAP')
	.controller('contaSenhaCtrl', function($scope, $state, $stateParams, contaAPI) {

		// Recuperação de senha única pra Avaliador/Participante (ver routes/index.js#/conta) -
		// mesmo padrão de avaliadorSenhaCtrl.js/participanteSenhaCtrl.js, só que sem
		// diferenciar o papel: quem pede o link não precisa saber se é avaliador(a) ou
		// participante.
		$scope.modoToken = $state.current.name === 'contaNovaSenha';
		$scope.senha = {};
		$scope.enviado = false;
		$scope.senhaAlterada = false;
		$scope.mensagemErro = '';

		$scope.pedirRecuperacao = function() {
			$scope.mensagemErro = '';
			contaAPI.redefinirSenha($scope.senha.email)
			.success(function() {
				$scope.enviado = true;
			})
			.error(function() {
				$scope.mensagemErro = 'Não encontramos esse e-mail cadastrado.';
			});
		};

		$scope.salvar = function() {
			$scope.mensagemErro = '';
			contaAPI.novaSenhaComToken($stateParams.token, $scope.senha.nova)
			.success(function(data) {
				if (data === 'Senha alterada') {
					$scope.senhaAlterada = true;
				} else {
					$scope.mensagemErro = 'Esse link não é mais válido. Peça uma nova recuperação de senha.';
				}
			})
			.error(function(status) {
				$scope.mensagemErro = typeof status === 'string' ? status : 'Não foi possível trocar a senha.';
			});
		};
	});
})();
