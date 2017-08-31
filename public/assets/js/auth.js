(function(){
	'use strict';

	angular
	.module('auth',[])
	.factory("authAPI", function($http) {

		let _postLogin = function(username,password) {
			const request = {
				url: '/login',
				method: 'POST',
				data: {
					username: username,
					password: password
				}
			}
			return $http(request);
		};

		return {
			postLogin: _postLogin
		};
	})
	.controller('homeCtrl', function($scope, $rootScope, $location, $mdDialog) {

		$scope.showLoginDialog = function(ev) {
			$mdDialog.show({
				// controller: () => this,
				templateUrl: '/views/login.html',
				parent: angular.element(document.body),
				targetEvent: ev,
				clickOutsideToClose: true
			});
		};

	})
	.controller('loginCtrl', function($scope, $rootScope, $window, $location, $mdDialog, authAPI) {

		$scope.login = function() {
			const username = $scope.user.username;
			const password = $scope.user.password;

			authAPI.postLogin(username,password)
			.success(function(projeto) { // authentication OK
				$rootScope.logado = true;
				$scope.message = 'Sucesso';
				$scope.erro = false;
				// localStorage.setItem('token','TOKEN_TESTE');
				$mdDialog.hide();
				// console.log(projeto);
				$window.location.href = projeto.redirect;
			})
			.error(function() { // authentication failed
				$rootScope.logado = false;
				$scope.message = 'Os dados estão incorretos.';
				$scope.erro = true;
			});
		};

		let enviarEmail = function(username) {
			projetosAPI.postRedefinir(username)
			.success(function(data) {
				$scope.email = data;
				let showAlert = function(ev) {
					$mdDialog.show(
						$mdDialog.alert()
						.parent(angular.element(document.querySelector('#popupContainer')))
						.clickOutsideToClose(false)
						.title('Quase lá...')
						.textContent('Foi enviado um email para '+$scope.email+', onde seguem as instruções para a alteração da senha.')
						.ok('OK')
						.targetEvent(ev)
					);
				};
				showAlert();
			})
			.error(function(status) {
				let showConfirmDialog = function(ev) {
					var confirm = $mdDialog.confirm()
					.title('Oxe...')
					.textContent('Houve algum erro ao enviar o email. Tente mais tarde ou então, entre em contato conosco.')
					.targetEvent(ev)
					.theme('error')
					.ok('Continuar')
					.cancel('Entrar em contato');
					$mdDialog.show(confirm).then(function() {}
					, function() {
						$window.location.href="http://movaci.com.br/contato";
					});
				};
				showConfirmDialog();
			});
		};

		$scope.showPrompt = function(ev) {
			var confirm = $mdDialog.prompt()
			.title('RECUPERAR SENHA')
			.placeholder('Username')
			.ariaLabel('Username')
			.targetEvent(ev)
			.ok('Enviar >')
			.cancel('Fechar');
			$mdDialog.show(confirm).then(function(result) {
				// console.log(result);
				let username = ({
					username: result
				});
				enviarEmail(username);
			}, function() {});
		};
	})
	.run(function($rootScope, $http, $window) {
			// Função logout está disponível em todas as páginas
			$rootScope.logout = function() {
				$http.post('/logout');
				$rootScope.logado = false;
				$window.location.href="/";
			};
	});
})();
