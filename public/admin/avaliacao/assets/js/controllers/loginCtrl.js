(function(){
	'use strict';

	angular
	.module('PDIAPav')
	.controller('loginCtrl', function($scope, $rootScope, $window, $state, $mdDialog, avaliacaoAPI) {

		$scope.login = function() {
			const username = $scope.user.username;
			const password = $scope.user.password;

			avaliacaoAPI.postLoginAvaliador(username,password)
			.then(function(response) { // authentication OK
				let id = response.data._id;
				$rootScope.logado = true;
				$scope.message = 'Sucesso';
				$scope.erro = false;
				$mdDialog.hide();
				$window.location.href="http://www.movaci.com.br/avaliacao/2016/"+id;
			}, function() { // authentication failed
				$rootScope.logado = false;
				$scope.message = 'Os dados estão incorretos.';
				$scope.erro = true;
			});
		};

		$scope.ir = function(url) {
			$window.location.href="http://www.movaci.com.br/"+url;
		}
	});
})();
