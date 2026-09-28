(function(){
	'use strict';

	angular
	.module('PDIAPa')
	.controller('participantesCtrl', function($scope, $rootScope, $timeout, $mdDialog, $mdToast, adminAPI) {

		$scope.eventos1 = [];
		$scope.eventos2 = [];
		$scope.eventos3 = [];
		$scope.eventos4 = [];
		$rootScope.participantes = [];
		$scope.CPFparticipantes = [];
		$scope.CPFsaberes = [];

		// A Mostra selecionada é compartilhada com as demais telas do admin ($rootScope.mostraId,
		// padrão = Mostra atual - ver definirMostraPadrao em routes/ui-routes.js): trocar aqui
		// vale nas outras telas e vice-versa.
		// O <md-select>+ng-repeat de Mostras, ao ser preenchido de forma assíncrona, religa cada
		// <md-option> e reescreve o ng-model no processo (bug conhecido do Angular Material com
		// ng-repeat dentro de md-select) - guarda o valor persistido ANTES e só carrega as
		// listas depois de reaplicá-lo.
		//
		// mostraId (o _id da Feira) é a chave de seleção de verdade - ano fica só como valor
		// DERIVADO da Mostra selecionada, porque pode haver mais de uma Mostra no mesmo ano (ver
		// memória project-mostra-ano-nao-unico). mostraEventos/mostraParticipantes usam
		// pertenceAMostra (Evento e Participante têm feiraId; sem ele cai no ano); mostraSaberes
		// continua filtrando por ano puro (Saberes não tem feiraId).
		$scope.mostras = [];

		let mostraIdPersistido = $rootScope.mostraId;
		let resolverMostraSelecionada = function() {
			$rootScope.mostraSelecionada = ($scope.mostras || []).filter(function(m) { return m._id === $rootScope.mostraId; })[0];
			$rootScope.ano = $rootScope.mostraSelecionada ? $rootScope.mostraSelecionada.ano : $rootScope.ano;
		};

		let formatCPF = function(cpf) {
			return cpf;
			// if (cpf !== undefined) {
			// 	cpf = cpf.substring(0,3) + "." + cpf.substring(3);
			// 	cpf = cpf.substring(0,7) + "." + cpf.substring(7);
			// 	cpf = cpf.substring(0,11) + "-" + cpf.substring(11);
			// 	return cpf;
			// }
		};

		$scope.toast = function(message,tema) {
			var toast = $mdToast.simple().textContent(message).action('✖').position('top right').theme(tema).hideDelay(10000);
			$mdToast.show(toast);
		};

		let mostraEventos = function() {
			adminAPI.getEventos()
			.then(function(response) {
				angular.forEach(response.data, function (value, key) {
					if(adminAPI.pertenceAMostra(value, $rootScope.mostraSelecionada)){
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
						} else if (value.tipo === 'Palestra') {
							$scope.eventos4.push(evento);
						}
					}
					
				});
			}, function(response) {
				console.log("Error: "+response.data);
			});
		};
		let getCPFparticipantes = function() {
			adminAPI.getCPFparticipantes()
			.then(function(response) {
				$scope.CPFparticipantes = [];
				angular.forEach(response.data, function (value, key) {
					$scope.CPFparticipantes.push(formatCPF(value.cpf));
				});
				// console.log($scope.CPFparticipantes);
				mostraSaberes();
			}, function(response) {
				console.log('Error: '+JSON.stringify(response.data));
			});
		};
		let mostraParticipantes = function() {
			adminAPI.getParticipantes()
			.then(function(response) {
				// $rootScope.participantes = [];
				angular.forEach(response.data, function (value, key) {
					if(adminAPI.pertenceAMostra(value, $rootScope.mostraSelecionada)){
						var index = $rootScope.participantes.map(function(e) { return e._id; }).indexOf(value._id);
						if (index === -1) {
							value.cpf = formatCPF(value.cpf);
							$rootScope.participantes.push(value);
						}
					}

				});
			}, function(response) {
				console.log("Error: "+response.data);
			});
		};
		let mostraSaberes = function() {
			adminAPI.getTodosSaberes()
			.then(function(response) {
				angular.forEach(response.data, function (value, key) {
					var ano = new Date(value.createdAt).getFullYear();
					if(ano == $rootScope.ano){
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
					}
					
				});
			}, function(response) {
				console.log("Error: "+response.data);
			});
		};

		adminAPI.getMostras()
		.then(function(response) {
			var mostras = response.data;
			$scope.mostras = mostras;
			$timeout(function() {
				if (mostraIdPersistido) $rootScope.mostraId = mostraIdPersistido;
				else if (!$rootScope.mostraId && mostras.length) $rootScope.mostraId = mostras[0]._id;
				resolverMostraSelecionada();
				mostraEventos();
				getCPFparticipantes();
				mostraParticipantes();
			});
		}, function(response) {
			console.log('Error: '+response.data);
			$rootScope.ano = $rootScope.ano || new Date().getFullYear();
			mostraEventos();
			getCPFparticipantes();
			mostraParticipantes();
		});

		$scope.recarregar = function(){
			resolverMostraSelecionada();
			$scope.eventos1 = [];
			$scope.eventos2 = [];
			$scope.eventos3 = [];
			$scope.eventos4 = [];
			mostraEventos();

			$scope.CPFparticipantes = [];
			$rootScope.participantes = [];
			getCPFparticipantes();
			mostraParticipantes();

		}

		$scope.cadastrarParticipante = function(participante) {
			// Cadastra o participante no ano selecionado no filtro do cabeçalho, em vez de
			// sempre no ano atual (permite inserir participantes de anos anteriores).
			participante.ano = $rootScope.ano;
			participante.feiraId = $rootScope.mostraId;
			adminAPI.postParticipante(participante)
			.then(function(response) {
				$scope.toast('Participante cadastrado com sucesso!','success-toast');
				mostraParticipantes();
				resetForm();
			}, function(response) {
				console.log('Error: '+response.data);
			});
		};

		$scope.visualizarDetalhes = function(participante,ev1) {
			var eventos1 = $scope.eventos1;
			var eventos2 = $scope.eventos2;
			var eventos3 = $scope.eventos3;
			var eventos4 = $scope.eventos4;
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
					$scope.eventos4 = eventos4;
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
						for (var w in $scope.eventos4) {
							if ($scope.eventos4[w].titulo === value.titulo) {
								$scope.eventos4[w].selected = true;
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
						angular.forEach(participante.eventos4, function (value, key) {
							eventos.push(value);
						});

						if (participante.tipo === 'SD') {
							let pacote = ({
								nome: participante.nome,
								cpf: participante.cpf,
								email: participante.email,
								eventos: eventos
							});
							adminAPI.postParticipante(pacote)
							.then(function(response) {
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
							}, function(response) {
								console.log('Error: '+response.data);
							});
						} else {
							let pacote = ({
								id: participante._id,
								nome: participante.nome,
								cpf: participante.cpf,
								email: participante.email,
								eventos: eventos
							});
							// console.log(pacote);
							adminAPI.putAtualizaParticipante(pacote)
							.then(function(response) {
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
								for (var w in $scope.eventos4) {
									$scope.eventos4[w].selected = false;
								}
								// console.log("inserido:");
								// console.log({
								// 	_id: participante._id,
								// 	nome: participante.nome,
								// 	cpf: participante.cpf,
								// 	eventos: eventos
								// });
								$mdDialog.hide();
							}, function(response) {
								console.log('Error: '+response.data);
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
							.then(function(response) {
								$mdDialog.hide();
								$scope.toast('Participante removido com sucesso!','success-toast');
								var index = $rootScope.participantes.map(function(e) { return e._id; }).indexOf(id);
								if (index !== -1) {
									$rootScope.participantes.splice(index, 1);
								}
							}, function(response) {
								$scope.toast('Falha.','failed-toast');
								console.log("Error: "+response.data);
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
	
		//Para reativar a não duplicidade de CPF do participante descomentar esta função
		//e adicionar: data-ng-change="verificaCPF(participante.cpf)" no input de cpf - (cadastro-participantes.html)

		/*$scope.verificaCPF = function(cpf) {
			for (var i in $scope.CPFparticipantes) {
				if ($scope.CPFparticipantes[i] === cpf) {
					$scope.participantesForm.cpf.$setValidity('duplicado',false);
					break; // importante parar caso email seja igual, senão não funciona
				} else {
					$scope.participantesForm.cpf.$setValidity('duplicado',true);
				}
			}
		};*/

		let resetForm = function() {
			delete $scope.participante;
			$scope.participantesForm.$setPristine();
			$scope.participantesForm.$setUntouched();
		};
	});
})();
