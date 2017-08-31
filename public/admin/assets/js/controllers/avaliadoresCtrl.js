(function(){
	'use strict';

	angular
	.module('PDIAPa')
	.controller('avaliadoresCtrl', function($scope, $window, $location, $mdDialog, adminAPI) {

		$scope.registrarAvaliador = function(avaliador) {
			// let pacote = ({
			// 	nome: avaliador.nome,
			// 	email: avaliador.email,
			// 	telefone: avaliador.telefone,
			// 	cpf: avaliador.cpf,
			// 	rg: avaliador.rg,
			// 	dtNascimento: avaliador.dtNascimento,
			// 	nivelAcademico: avaliador.nivelAcademico,
			// 	atuacaoProfissional: avaliador.atuacaoProfissional,
			// 	tempoAtuacao: avaliador.tempoAtuacao,
			// 	categoria: avaliador.categoria,
			// 	eixo: avaliador.eixo,
			// 	curriculo: curriculo1,
			// 	turnos: avaliador.turnos
			// });
			adminAPI.saveAvaliador(avaliador)
			.success(function(data, status) {
				if (data === 'success') {
					let showConfirmDialog = function(ev) {
						var confirm = $mdDialog.confirm()
						.title('Parabéns!')
						.textContent('Inscrição realizada com sucesso!')
						.ariaLabel('Inscrição realizada com sucesso!')
						.targetEvent(ev)
						.ok('OK')
						$mdDialog.show(confirm);
					};
					showConfirmDialog();
					resetForm();
				} else {
					let showConfirmDialog = function(ev) {
						var confirm = $mdDialog.confirm()
						.title('Ops...')
						.textContent('A inscrição não foi realizada. Por favor, tente novamente.')
						.ariaLabel('A inscrição não foi realizada.')
						.targetEvent(ev)
						.theme('error')
						.ok('OK');
						$mdDialog.show(confirm);
					};
					showConfirmDialog();
				}
			})
			.error(function(status) {
				let showConfirmDialog = function(ev) {
					var confirm = $mdDialog.confirm()
					.title('Ops...')
					.textContent('A inscrição não foi realizada. Por favor, tente novamente.')
					.ariaLabel('A inscrição não foi realizada.')
					.targetEvent(ev)
					.theme('error')
					.ok('OK');
					$mdDialog.show(confirm);
				};
				showConfirmDialog();
				console.log(status);
			});
		};

		let resetForm = function() {
			delete $scope.avaliadores;
			$scope.avaliadoresForm.$setPristine();
			$scope.avaliadoresForm.$setUntouched();
		};
	});
})();
