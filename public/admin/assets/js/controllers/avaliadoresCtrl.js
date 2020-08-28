(function(){
	'use strict';

	angular
	.module('PDIAPa')
	.controller('avaliadoresCtrl', function($scope, $window, $location, $mdDialog, adminAPI) {

		$scope.avaliadores = [];
		$scope.count = 0;

		$scope.year = CadastraAno();

		$scope.registrarAvaliador = function(avaliador) {
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
					$scope.recarregar();
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

		let mostraAvaliadores = function() {
			adminAPI.getAvaliadores()
			.success(function(avaliadores){
				angular.forEach(avaliadores, function (value, key) {
					var index = $scope.avaliadores.map(function(a) { return a._id; }).indexOf(value._id);
					if (index === -1) {
						if(value.avaliacao === true) $scope.count++;
						var ano = new Date(value.createdAt).getFullYear();
						if(ano == $scope.ano){
							var cpf = formatCPF(value.cpf);
							/*var avaliacao = false;
							if(value.avaliacao !== undefined) avaliacao = value.avaliacao;*/
							let avaliador = ({
								_id: value._id,
								nome: value.nome,
								cpf: cpf,
								avaliacao: value.avaliacao,
								ano: ano
							});
							$scope.avaliadores.push(avaliador);
						}						
					}
				});				
			})
			.error(function(status) {
				console.log("Error: "+status);
			});
		};
		$scope.mostraAvaliadores = mostraAvaliadores();

		$scope.recarregar = function(){
			$scope.avaliadores = [];
			$scope.count = 0;
			$scope.idAvaliadoresMarcados = [];
			$scope.idAvaliadoresNMarcados = [];
			mostraAvaliadores();
		}

		let formatCPF = function(cpf) {
			if (cpf !== undefined) {
				cpf = cpf.substring(0,3) + "." + cpf.substring(3);
				cpf = cpf.substring(0,7) + "." + cpf.substring(7);
				cpf = cpf.substring(0,11) + "-" + cpf.substring(11);
				return cpf;
			}
		};

		$scope.idAvaliadoresMarcados = [];
		$scope.idAvaliadoresNMarcados = [];
		$scope.contador = function(check,idAva) {
			if (check) {
				$scope.count--;
				let index = $scope.idAvaliadoresMarcados.indexOf(idAva);
				if (index !== -1) {
					$scope.idAvaliadoresMarcados.splice(index, 1);
				}
				$scope.idAvaliadoresNMarcados.push(idAva);
			}
			else {
				$scope.count++;
				let index = $scope.idAvaliadoresNMarcados.indexOf(idAva);
				if (index !== -1) {
					$scope.idAvaliadoresNMarcados.splice(index, 1);
				}
				$scope.idAvaliadoresMarcados.push(idAva);
			}
		}

		$scope.update = function() {		
			adminAPI.putSetAvaliadores($scope.idAvaliadoresMarcados,$scope.idAvaliadoresNMarcados)
			.success(function(data, status) {
				$scope.toast('Avaliador(es) atualizado(s) com sucesso!','success-toast');
				var count = 0;
				if ($scope.idAvaliadoresMarcados.length !== 0) {
							angular.forEach($scope.avaliadores, function (value, key) {
								for (var x = 0; x < $scope.idAvaliadoresMarcados.length; x++) {
									if (value._id === $scope.idAvaliadoresMarcados[x]) {
										$scope.avaliadores[count].avaliacao = true;
									}
								}
								count++;
							});						
					count = 0;
				}
				if ($scope.idAvaliadoresNMarcados.length !== 0) {
							angular.forEach($scope.avaliadores, function (value, key) {
								for (var x = 0; x < $scope.idAvaliadoresNMarcados.length; x++) {
									if (value._id === $scope.idProjetosReprovados[x]) {
										$scope.avaliadores[count].avaliacao = false;
									}
								}
								count++;
							});
				}
			})
			.error(function(status) {
				console.log('Error: '+status);
			});
		}

		$scope.removerAvaliador = function(ev,id,nome) {
			var confirm = $mdDialog.confirm()
			.textContent('Deseja remover o avaliador '+nome+'?')
			.ariaLabel('Remover avaliador')
			.targetEvent(ev)
			.ok('Sim')
			.cancel('Não');
			$mdDialog.show(confirm).then(function() {
				adminAPI.putRemoveAvaliador(id)
				.success(function(data) {
					$scope.toast('Avaliador removido com sucesso!','success-toast');
					var index = $scope.avaliadores.map(function(e) { return e._id; }).indexOf(id);
					if (index !== -1) {
						if($scope.avaliadores[index].avaliacao === true) $scope.count--;
						$scope.avaliadores.splice(index, 1);
					}
				})
				.error(function(status) {
					$scope.toast('Falha.','failed-toast');
					console.log("Error: "+status);
				});
			}, function() {});
		};

		let resetForm = function() {
			delete $scope.avaliador;
			$scope.avaliadoresForm.$setPristine();
			$scope.avaliadoresForm.$setUntouched();
		};
	});
})();
