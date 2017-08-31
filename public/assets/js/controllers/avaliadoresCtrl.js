(function(){
	'use strict';

	angular
	.module('PDIAP')
	.controller('avaliadoresCtrl', function($scope, $window, $location, $mdDialog, projetosAPI) {

		$scope.eixos = [];

		projetosAPI.getCategorias()
		.success(function(data) {
			$scope.listaCategorias = data.categorias;
		})
		.error(function(status) {
			console.log(status);
		});

		$scope.selectEixos = function(cat) {
			angular.forEach($scope.listaCategorias, function (value, key){
				//verifica a categoria selecionada
				if(cat === value.categoria){
					$scope.eixos = [];
					//adiciona os eixos em $scope.eixos
					for (var i in value.eixos) {
						$scope.eixos.push(value.eixos[i]);
					}
				}
			});
		};

		$scope.registrarAvaliador = function(avaliador) {
			let curriculo1 = '';
			if ($scope.lattesVerify === 'Sim') {
				curriculo1 = avaliador.link;
			} else if ($scope.lattesVerify === 'Não') {
				curriculo1 = avaliador.resumoAtividades;
			}
			let pacote = ({
				nome: avaliador.nome,
				email: avaliador.email,
				telefone: avaliador.telefone,
				cpf: avaliador.cpf,
				rg: avaliador.rg,
				dtNascimento: avaliador.dtNascimento,
				nivelAcademico: avaliador.nivelAcademico,
				atuacaoProfissional: avaliador.atuacaoProfissional,
				tempoAtuacao: avaliador.tempoAtuacao,
				categoria: avaliador.categoria,
				eixo: avaliador.eixo,
				curriculo: curriculo1,
				turnos: avaliador.turnos
			});
			projetosAPI.saveAvaliador(pacote)
			.success(function(data, status) {
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
							$location.url('/');
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
			})
			.error(function(status) {
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
				console.log(status);
			});
		};

		let resetForm = function() {
			delete $scope.avaliadores;
			$scope.avaliadoresForm.$setPristine();
			$scope.avaliadoresForm.$setUntouched();
			$scope.avaliadoresForm.turnos.$setUntouched();
			$scope.lattesVerify = '';
		};
	});
})();
