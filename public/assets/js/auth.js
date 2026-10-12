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
	.controller('loginCtrl', function($scope, $rootScope, $window, $location, $mdDialog, authAPI, projetosAPI) {

		$scope.login = function() {
			const username = $scope.user.username;
			const password = $scope.user.password;

			authAPI.postLogin(username,password)
			.then(function(response) { // authentication OK
				var projeto = response.data;
				$rootScope.logado = true;
				$scope.message = 'Sucesso';
				$scope.erro = false;
				// localStorage.setItem('token','TOKEN_TESTE');
				$mdDialog.hide();
				// console.log(projeto);
				$window.location.href = projeto.redirect;
			}, function() { // authentication failed
				$rootScope.logado = false;
				$scope.message = 'Os dados estão incorretos.';
				$scope.erro = true;
			});
		};

		// "Esqueceu sua senha?" (login.html) leva pra /conta/esqueci-senha. A recuperação da senha do
		// login próprio do projeto (que já estava quebrada: chamava projetosAPI.postRedef1inir) saiu
		// junto com esse login.
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
