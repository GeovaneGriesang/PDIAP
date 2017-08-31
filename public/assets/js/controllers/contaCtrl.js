(function(){
	'use strict';

	angular
	.module('PDIAP')
	.controller('contaCtrl', function($scope, $mdDialog, $location, projetosAPI) {

		$scope.usernames = [];

		projetosAPI.getUsersEscolas()
		.success(function(data) {
			angular.forEach(data, function (value) {
				if (value.username !== undefined) {
					$scope.usernames.push(value.username);
				}
			});
		});

		$scope.verificaUsername = function(username) {
			for (var i in $scope.usernames) {
				if ($scope.usernames[i] == username) {
					$scope.contaForm.username.$setValidity('duplicado',false);
					break; // importante parar caso username seja igual, senão não funciona
				} else {
					$scope.contaForm.username.$setValidity('duplicado',true);
				}
			}
		};

		$scope.enviarEmail2 = function() {
			let pacote = ({
				username: $scope.conta.username
			});
			projetosAPI.postRedefinir(pacote)
			.success(function(data) {
				$scope.email = data;
				console.log('EMAIL ENVIADO');
				let showAlert4 = function(ev) {
					$mdDialog.show(
						$mdDialog.alert()
						.parent(angular.element(document.querySelector('#popupContainer3')))
						.clickOutsideToClose(false)
						.title('Quase lá...')
						.textContent('Foi enviado um email para '+$scope.email+', onde seguem as instruções para a alteração da senha.')
						.ok('OK')
						.targetEvent(ev)
					);
				};
				showAlert4();
			})
			.error(function(status) {
				console.log('EMAIL NÃO FOI ENVIADO AF TIO');
				let showConfirmDialog4 = function(ev) {
					var confirm = $mdDialog.confirm()
					.title('Ops...')
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
				showConfirmDialog4();
			});
		};
	});
})();
