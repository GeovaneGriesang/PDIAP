(function(){
	'use strict';

	angular
	.module('PDIAPa')
	.controller('participantesCtrl', function($scope, $rootScope, $mdDialog, $mdToast, adminAPI) {

		$scope.eventos1 = [];
		$scope.eventos2 = [];
		$scope.eventos3 = [];
		$rootScope.participantes = [];
		$scope.CPFparticipantes = [];
		$scope.CPFsaberes = [];

		let formatCPF = function(cpf) {
			if (cpf !== undefined) {
				cpf = cpf.substring(0,3) + "." + cpf.substring(3);
				cpf = cpf.substring(0,7) + "." + cpf.substring(7);
				cpf = cpf.substring(0,11) + "-" + cpf.substring(11);
				return cpf;
			}
		};

		$scope.toast = function(message,tema) {
			var toast = $mdToast.simple().textContent(message).action('✖').position('top right').theme(tema).hideDelay(10000);
			$mdToast.show(toast);
		};

		let mostraEventos = function() {
			adminAPI.getEventos()
			.success(function(eventos) {
				angular.forEach(eventos, function (value, key) {
					let evento = ({
						tipo: value.tipo,
						titulo: value.titulo,
						cargaHoraria: value.cargaHoraria
					});
					if (value.tipo === 'Semana Acadêmica') {
						$scope.eventos1.push(evento);
					} else if (value.tipo === 'Seminário Saberes Docentes') {
						$scope.eventos2.push(evento);
					} else if (value.tipo === 'Oficina') {
						$scope.eventos3.push(evento);
					}
				});
			})
			.error(function(status) {
				console.log("Error: "+status);
			});
		};
		$scope.mostraEventos = mostraEventos();

		let getCPFparticipantes = function() {
			adminAPI.getCPFparticipantes()
			.success(function(cpfs) {
				$scope.CPFparticipantes = [];
				angular.forEach(cpfs, function (value, key) {
					$scope.CPFparticipantes.push(formatCPF(value.cpf));
				});
				// console.log($scope.CPFparticipantes);
				mostraSaberes();
			})
			.error(function(status) {
				console.log('Error: '+status);
			});
		};
		$scope.getCPFparticipantes = getCPFparticipantes();

		let mostraParticipantes = function() {
			adminAPI.getParticipantes()
			.success(function(participantes) {
				// $rootScope.participantes = [];
				angular.forEach(participantes, function (value, key) {
					var index = $rootScope.participantes.map(function(e) { return e._id; }).indexOf(value._id);
					if (index === -1) {
						value.cpf = formatCPF(value.cpf);
						$rootScope.participantes.push(value);
					}
				});
			})
			.error(function(status) {
				console.log("Error: "+status);
			});
		};
		$scope.mostraParticipantes = mostraParticipantes();

		let mostraSaberes = function() {
			adminAPI.getTodosSaberes()
			.success(function(saberes) {
				angular.forEach(saberes, function (value, key) {
					let CPFvalido = true;
					let CPFverify = formatCPF(value.cpf);
					for (var i = 0; i < $scope.CPFparticipantes.length; i++) {
						if (CPFverify === $scope.CPFparticipantes[i]) {
							CPFvalido = false;
							break;
						}
					}
					if (CPFvalido) {
						let pacote = ({
							_id: value._id,
							tipo: "SD",
							nome: value.nome,
							cpf: formatCPF(value.cpf)
						});
						$rootScope.participantes.push(pacote);
					}
				});
			})
			.error(function(status) {
				console.log("Error: "+status);
			});
		};

		$scope.cadastrarParticipante = function(participante) {
			adminAPI.postParticipante(participante)
			.success(function(data) {
				$scope.toast('Participante cadastrado com sucesso!','success-toast');
				mostraParticipantes();
				resetForm();
			})
			.error(function(status) {
				console.log('Error: '+status);
			});
		};

		$scope.visualizarDetalhes = function(participante,ev1) {
			var eventos1 = $scope.eventos1;
			var eventos2 = $scope.eventos2;
			var eventos3 = $scope.eventos3;
			$mdDialog.show({
				controller: function dialogParticipanteController($scope, $rootScope, $mdToast, $mdDialog, adminAPI) {
					$scope.toast = function(message,tema) {
						var toast = $mdToast.simple().textContent(message).action('✖').position('top right').theme(tema).hideDelay(10000);
						$mdToast.show(toast);
					};
					$scope.participante = participante;
					$scope.eventos1 = eventos1;
					$scope.eventos2 = eventos2;
					$scope.eventos3 = eventos3;
					angular.forEach(participante.eventos, function (value, key) {
						for (var x in $scope.eventos1) {
							if ($scope.eventos1[x].titulo === value.titulo) {
								$scope.eventos1[x].selected = true;
							}
						}
						for (var y in $scope.eventos2) {
							if ($scope.eventos2[y].titulo === value.titulo) {
								$scope.eventos2[y].selected = true;
							}
						}
						for (var z in $scope.eventos3) {
							if ($scope.eventos3[z].titulo === value.titulo) {
								$scope.eventos3[z].selected = true;
							}
						}
					});
					$scope.alterarParticipante = function(participante) {
						participante.eventos = [];
						let eventos = [];
						angular.forEach(participante.eventos1, function (value, key) {
							eventos.push(value);
						});
						angular.forEach(participante.eventos2, function (value, key) {
							eventos.push(value);
						});
						angular.forEach(participante.eventos3, function (value, key) {
							eventos.push(value);
						});

						if (participante.tipo === 'SD') {
							let pacote = ({
								nome: participante.nome,
								cpf: participante.cpf,
								eventos: eventos
							});
							adminAPI.postParticipante(pacote)
							.success(function(data) {
								$scope.toast('Participante atualizado com sucesso!','success-toast');
								// var index = $rootScope.participantes.map(function(e) { return e._id; }).indexOf(participante._id);
								// if (index !== -1) {
								// 	// console.log("removido:");
								// 	// console.log($rootScope.participantes[index]);
								// 	$rootScope.participantes.splice(index, 1);
								// }
								$mdDialog.hide();
								$rootScope.participantes = [];
								getCPFparticipantes();
								mostraParticipantes();
							})
							.error(function(status) {
								console.log('Error: '+status);
							});
						} else {
							let pacote = ({
								id: participante._id,
								nome: participante.nome,
								cpf: participante.cpf,
								eventos: eventos
							});
							// console.log(pacote);
							adminAPI.putAtualizaParticipante(pacote)
							.success(function(data) {
								$scope.toast('Participante atualizado com sucesso!','success-toast');
								// var index = $rootScope.participantes.map(function(e) { return e._id; }).indexOf(participante._id);
								// if (index !== -1) {
								// 	// console.log("removido:");
								// 	// console.log($rootScope.participantes[index]);
								// 	$rootScope.participantes.splice(index, 1);
								// }
								// $rootScope.participantes.push({
								// 	_id: participante._id,
								// 	nome: participante.nome,
								// 	cpf: participante.cpf,
								// 	eventos: eventos
								// });
								$rootScope.participantes = [];
								getCPFparticipantes();
								mostraParticipantes();
								for (var x in $scope.eventos1) {
									$scope.eventos1[x].selected = false;
								}
								for (var y in $scope.eventos2) {
									$scope.eventos2[y].selected = false;
								}
								for (var z in $scope.eventos3) {
									$scope.eventos3[z].selected = false;
								}
								// console.log("inserido:");
								// console.log({
								// 	_id: participante._id,
								// 	nome: participante.nome,
								// 	cpf: participante.cpf,
								// 	eventos: eventos
								// });
								$mdDialog.hide();
							})
							.error(function(status) {
								console.log('Error: '+status);
							});
						}
					};
					$scope.removerParticipante = function(ev,id,nome) {
						var confirm = $mdDialog.confirm()
						.textContent('Deseja remover a/o participante '+nome+'?')
						.ariaLabel('Remover participante')
						.targetEvent(ev)
						.ok('Sim')
						.cancel('Não');
						$mdDialog.show(confirm).then(function() {
							adminAPI.putRemoveParticipante(id)
							.success(function(data) {
								$mdDialog.hide();
								$scope.toast('Participante removido com sucesso!','success-toast');
								var index = $rootScope.participantes.map(function(e) { return e._id; }).indexOf(id);
								if (index !== -1) {
									$rootScope.participantes.splice(index, 1);
								}
							})
							.error(function(status) {
								$scope.toast('Falha.','failed-toast');
								console.log("Error: "+status);
							});
						}, function() {});
					};
					$scope.hide = function() {
						$mdDialog.hide();
					};
					$scope.cancel = function() {
						$mdDialog.cancel();
					};
				},
				templateUrl: 'admin/views/details.participante.html',
				parent: angular.element(document.body),
				targetEvent: ev1,
				clickOutsideToClose: false,
				fullscreen: true // Only for -xs, -sm breakpoints.
			});
		};

		$scope.verificaCPF = function(cpf) {
			for (var i in $scope.CPFparticipantes) {
				if ($scope.CPFparticipantes[i] === cpf) {
					$scope.participantesForm.cpf.$setValidity('duplicado',false);
					break; // importante parar caso email seja igual, senão não funciona
				} else {
					$scope.participantesForm.cpf.$setValidity('duplicado',true);
				}
			}
		};

		let resetForm = function() {
			delete $scope.participante;
			$scope.participantesForm.$setPristine();
			$scope.participantesForm.$setUntouched();
		};
	});
})();
