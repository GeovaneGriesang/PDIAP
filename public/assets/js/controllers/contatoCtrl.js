(function(){
	'use strict';

	angular
	.module('PDIAP')
	.controller('contatoCtrl', function($scope, $location, $mdDialog, projetosAPI) {

		$scope.enviarContato = function(contato) {
			projetosAPI.postContato(contato)
			.success(function(data) {
				console.log(data);
				if (data === 'success') {
					let showAlert2 = function(ev) {
						$mdDialog.show(
							$mdDialog.alert()
							.parent(angular.element(document.querySelector('#page-wrapper')))
							.clickOutsideToClose(false)
							.textContent('Email enviado! Em breve entraremos em contato. Abraço!')
							.ok('OK')
							.targetEvent(ev)
						).then(function(result) {
							$location.url('/');
						}, function() {});
					};
					showAlert2();
					resetForm();
				} else {
					let showAlert2 = function(ev) {
						$mdDialog.show(
							$mdDialog.alert()
							.parent(angular.element(document.querySelector('#page-wrapper')))
							.clickOutsideToClose(false)
							.textContent('Houve algum erro no envio do email. Tente mais tarde, obrigado.')
							.theme('error')
							.ok('OK')
							.targetEvent(ev)
						);
					};
					showAlert2();
				}
			})
			.error(function(status) {
				let showAlert2 = function(ev) {
					$mdDialog.show(
						$mdDialog.alert()
						.parent(angular.element(document.querySelector('#page-wrapper')))
						.clickOutsideToClose(false)
						.textContent('Houve algum erro no envio do email. Tente mais tarde, obrigado.')
						.theme('error')
						.ok('OK')
						.targetEvent(ev)
					);
				};
				showAlert2();
				console.log(status);
			});
		};

		let resetForm = function() {
			delete $scope.contato;
			$scope.contatoForm.$setPristine();
			$scope.contatoForm.$setUntouched();
		};
	});
})();
