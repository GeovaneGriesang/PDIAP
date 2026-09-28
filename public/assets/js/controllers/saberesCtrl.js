(function(){
	'use strict';

	angular
	.module('PDIAP')
	.controller('saberesCtrl', function($scope, $rootScope, $window, $location, $mdDialog, projetosAPI) {

		$scope.saberes_docentes = true;
		
		$scope.carregarEdits = function(){
			projetosAPI.getEdits().then(function(response){
				var edits = response.data;
				if(edits[0].saberes_docentes == false){
					$scope.saberes_docentes = false;
					let showConfirmDialog = function(ev) {
						var confirm = $mdDialog.alert()
						.title('Página bloqueada!')
						.textContent('Esta pagina não está disponível no momento!')
						.ariaLabel('Esta pagina não está disponível no momento!')
						.targetEvent(ev)
						.theme('error')
						.ok('OK, Voltar')
						.escapeToClose(false)
						$mdDialog.show(confirm).then(function() {
							$window.location.href="http://movaci.com.br/";
						}, function() {});
					};
					showConfirmDialog();
				}
			}, function(response) {
				console.log(response.data);
			});
		}
		$scope.carregarEdits();

		// $rootScope.inscrito = 0;
		$scope.escolas = [];

		projetosAPI.getEscolasSaberes()
		.then(function(response) {
			angular.forEach(response.data, function (value) {
				if (value.escola !== undefined) {
					let escolaIdem = false;
					for (var i in $scope.escolas) {
						if (value.escola === $scope.escolas[i]) {
							escolaIdem = true;
							break;
						}
					}
					if (escolaIdem === false) {
						$scope.escolas.push(value.escola);
					}
				}
			});
		}, function(response) {
			console.log('Error: ' + response.data);
		});

		$scope.registrarSaberes = function(saberes) {
			projetosAPI.saveSaberesDocentes(saberes)
			.then(function(response) {
				var data = response.data;
				if (data === 'success') {
					let showConfirmDialog = function(ev) {
						var confirm = $mdDialog.confirm()
						.title('Parabéns!')
						.textContent('Inscrição realizada com sucesso!')
						.ariaLabel('Inscrição realizada com sucesso!')
						.targetEvent(ev)
						.ok('OK, Voltar')
						.cancel('Nova Inscrição');
						$mdDialog.show(confirm).then(function() {
							$window.location.href="http://movaci.com.br";
						}, function() {});
					};
					showConfirmDialog();
					resetForm();
				} else {
					let showConfirmDialog = function(ev) {
						var confirm = $mdDialog.confirm()
						.title('Ops...')
						.textContent('A inscrição não foi realizada. Tente novamente ou então, entre em contato conosco.')
						.ariaLabel('A inscrição não foi realizada.')
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
				}
			}, function(response) {
				let showConfirmDialog = function(ev) {
					var confirm = $mdDialog.confirm()
					.title('Ops...')
					.textContent('A inscrição não foi realizada. Tente novamente ou então, entre em contato conosco.')
					.ariaLabel('A inscrição não foi realizada.')
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
				console.log(response.data);
			});
			console.log(saberes);
		};

		let resetForm = function() {
			delete $scope.saberes;
			$scope.saberesForm.$setPristine();
			$scope.saberesForm.$setUntouched();
		};
	});
})();
