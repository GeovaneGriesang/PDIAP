(function(){
	'use strict';

	angular
	.module('PDIAPa')
	.controller('projetosCtrl', function($scope, $rootScope, $q, $window, $mdDialog, $timeout, adminAPI) {

		$rootScope.projetos = [];
		$scope.searchProject = "";
		$scope.idAprovados = [];
		$scope.count = 0;

		$scope.year = CadastraAno();

		// O ano do filtro fica no $rootScope (em vez de $scope) para persistir ao navegar entre
		// "Selecionar aprovados", "Presença" e "Premiação" - as três usam este mesmo controller,
		// mas o ui-router recria a instância a cada troca de página, então um $scope.ano se
		// perderia a cada navegação. Sem seleção prévia nesta sessão, cai no ano atual.
		//
		// O valor persistido precisa ser guardado ANTES e reaplicado só depois de um $timeout:
		// o próprio <md-select>+ng-repeat de opções de ano, ao ser recriado do zero nesta troca
		// de página, religa cada <md-option> (2016, 2017, ..., ano atual) e no processo reescreve
		// o ng-model a cada uma (bug conhecido do Angular Material com ng-repeat dentro de
		// md-select), deixando o modelo travado no último ano da lista se não corrigirmos depois
		// que essa religação (síncrona) terminar.
		let anoPersistido = $rootScope.ano;
		$rootScope.ano = anoPersistido || new Date().getFullYear();

		let countTotal = 0;
		$scope.hosp = [];
		let carregarProjetos = function() {
			adminAPI.getTodosProjetos()
			.success(function(projetos) {
				angular.forEach(projetos, function (value, key) {
					var ano = new Date(value.createdAt).getFullYear();
					if(ano == $rootScope.ano){
						let obj = ({
							_id: value._id,
							numInscricao: value.numInscricao,
							nomeProjeto: value.nomeProjeto,
							nomeEscola: value.nomeEscola,
							categoria: value.categoria,
							eixo: value.eixo,
							aprovado: value.aprovado,
							participa: value.participa,
							integrantes: value.integrantes,
							createdAt: ano,
							premiacao: value.premiacao,
							mostratec: value.mostratec,
							feirasClassificadas: value.feirasClassificadas,
							colocacao: value.colocacao
						});
						$rootScope.projetos.push(obj);
						if (obj.aprovado === true) {
							$scope.count++;
						}
					}	
					
				});
			})
			.error(function(status) {
				console.log(status);
			});
		};
		$scope.carregarProjetos = carregarProjetos;

		// $scope.querySearch = function querySearch (query) {
		// 	let deferred = $q.defer();
		// 	return deferred;
		// }

		// $scope.count = 0;
		// $scope.contador = function(check,idProj) {
		// 	if (check) {
		// 		$scope.count--;
		// 		let index = $scope.idAprovados.indexOf(idProj);
		// 		$scope.idAprovados.splice(index, 1);
		// 	}
		// 	else {
		// 		$scope.count++;
		// 		$scope.idAprovados.push(idProj);
		// 	}
		// }

		$scope.idProjetosAprovados = [];
		$scope.idProjetosReprovados = [];
		$scope.contador = function(check,idProj) {
			if (check) {
				$scope.count--;
				let index = $scope.idProjetosAprovados.indexOf(idProj);
				if (index !== -1) {
					$scope.idProjetosAprovados.splice(index, 1);
				}
				$scope.idProjetosReprovados.push(idProj);
			}
			else {
				$scope.count++;
				let index = $scope.idProjetosReprovados.indexOf(idProj);
				if (index !== -1) {
					$scope.idProjetosReprovados.splice(index, 1);
				}
				$scope.idProjetosAprovados.push(idProj);
			}
			// console.log("Aprovados: "+$scope.idProjetosAprovados);
			// console.log("Reprovados: "+$scope.idProjetosReprovados);
		}

		$rootScope.recarregar = function(){
			$rootScope.projetos = [];
			$scope.searchProject = "";
			$scope.idAprovados = [];
			$scope.count = 0;
			$scope.idProjetosAprovados = [];
			$scope.idProjetosReprovados = [];
			$scope.year = CadastraAno();
			carregarProjetos();
		}

		$scope.visualizarDetalhes = function(projeto,ev) {
			$mdDialog.show({
				controller: function dialogController($scope, $rootScope, $mdDialog, $mdToast, $timeout, adminAPI) {
					$scope.details = projeto;
					$scope.idIntegrantesPresentes = [];
					$scope.idIntegrantesAusentes = [];
					// let carregaIds = function() {
					// 	angular.forEach(projeto.integrantes, function (value, key) {
					// 		if (value.presenca === true) {
					// 			$scope.idIntegrantesPresentes.push(value._id);
					// 		}
					// 	});
					// 	console.log($scope.idIntegrantesPresentes);
					// }
					// carregaIds();
					$scope.contador1 = function(check,idIntegrante) {
						if (check) {
							let index = $scope.idIntegrantesPresentes.indexOf(idIntegrante);
							if (index !== -1) {
								$scope.idIntegrantesPresentes.splice(index, 1);
							}
							$scope.idIntegrantesAusentes.push(idIntegrante);
						}
						else {
							let index = $scope.idIntegrantesAusentes.indexOf(idIntegrante);
							if (index !== -1) {
								$scope.idIntegrantesAusentes.splice(index, 1);
							}
							$scope.idIntegrantesPresentes.push(idIntegrante);
						}
						// console.log("Presentes: "+$scope.idIntegrantesPresentes);
						// console.log("Ausentes: "+$scope.idIntegrantesAusentes);
					}
					$scope.setPresenca = function() {
						adminAPI.putPresencaProjetos($scope.idIntegrantesPresentes,$scope.idIntegrantesAusentes)
						.success(function(data, status) {
							$scope.toast('Presença cadastrada com sucesso!','success-toast');
							var count = 0;
							if ($scope.idIntegrantesPresentes.length !== 0) {
								for (var i = 0; i < $rootScope.projetos.length; i++) {
									if ($rootScope.projetos[i]._id === $scope.details._id) {
										angular.forEach($rootScope.projetos[i].integrantes, function (value, key) {
											count++;
											for (var x = 0; x < $scope.idIntegrantesPresentes.length; x++) {
												if (value._id === $scope.idIntegrantesPresentes[x]) {
													$rootScope.projetos[i].integrantes[count-1].presenca = true;
												}
											}
										});
									}
								}
							}
							count = 0;
							if ($scope.idIntegrantesAusentes.length !== 0) {
								for (var i = 0; i < $rootScope.projetos.length; i++) {
									if ($rootScope.projetos[i]._id === $scope.details._id) {
										angular.forEach($rootScope.projetos[i].integrantes, function (value, key) {
											count++;
											for (var x = 0; x < $scope.idIntegrantesAusentes.length; x++) {
												if (value._id === $scope.idIntegrantesAusentes[x]) {
													$rootScope.projetos[i].integrantes[count-1].presenca = false;
												}
											}
										});
									}
								}
							}
							$mdDialog.hide();
							$scope.idIntegrantesPresentes = [];
							$scope.idIntegrantesAusentes = [];
						})
						.error(function(status) {
							$scope.toast('Falha.','failed-toast');
							console.log('Error: '+status);
						});
					}
					$scope.toast = function(message,tema) {
						var toast = $mdToast.simple().textContent(message).action('✖').position('top right').theme(tema).hideDelay(4000);
						$mdToast.show(toast);
					};
					$scope.hide = function() {
						$mdDialog.hide();
					};
					$scope.cancel = function() {
						$mdDialog.cancel();
					};
				},
				templateUrl: 'admin/views/details.presenca_projetos.html',
				parent: angular.element(document.body),
				targetEvent: ev,
				clickOutsideToClose: false,
				fullscreen: true // Only for -xs, -sm breakpoints.
			});
		};

		$scope.visualizarDetalhesPremiacao = function(projeto,ev) {
			$mdDialog.show({
				controller: function dialogController($scope, $rootScope, $mdDialog, $mdToast, adminAPI) {
					$scope.details = projeto;
					$scope.premiacao = {_id:projeto._id};

					// Feiras aplicáveis a este projeto: só as cadastradas pro ano/categoria dele
					// (ver "Eventos > Cadastrar Feiras") - cada uma vira um checkbox independente
					// de Premiação/Menção Honrosa (details.premiacao.html).
					$scope.feirasDisponiveis = [];
					$scope.premiacao.feirasSelecionadas = {};
					adminAPI.getFeiras().success(function(feiras) {
						angular.forEach(feiras, function (feira) {
							if (feira.ano == $rootScope.ano && feira.categorias.indexOf(projeto.categoria) !== -1) {
								$scope.feirasDisponiveis.push(feira);
								if (projeto.feirasClassificadas && projeto.feirasClassificadas.indexOf(feira._id) !== -1) {
									$scope.premiacao.feirasSelecionadas[feira._id] = true;
								}
							}
						});
					});

					$scope.setPremiado = function() {
						$scope.premiacao.feirasClassificadas = Object.keys($scope.premiacao.feirasSelecionadas).filter(function(id) {
							return $scope.premiacao.feirasSelecionadas[id];
						});
						adminAPI.putPremiadoProjetos($scope.premiacao).success(function(data, status) {
							$scope.toast('Projeto premiado com sucesso!','success-toast');

							setTimeout($rootScope.recarregar, 750);
						}).error(function(status) {
							$scope.toast('Falha.','failed-toast');
							console.log('Error: '+status);
						});
					};
					$scope.toast = function(message,tema) {
						var toast = $mdToast.simple().textContent(message).action('✖').position('top right').theme(tema).hideDelay(4000);
						$mdToast.show(toast);
					};
					$scope.hide = function() {
						$mdDialog.hide();
					};
					$scope.cancel = function() {
						$mdDialog.cancel();
					};
				},
				templateUrl: 'admin/views/details.premiacao.html',
				parent: angular.element(document.body),
				targetEvent: ev,
				clickOutsideToClose: false,
				fullscreen: true // Only for -xs, -sm breakpoints.
			});
		};

		$scope.update = function() {
			console.log("salvando aprovados: " + $scope.idProjetosAprovados + " " + $scope.idProjetosReprovados);
			adminAPI.putSetAprovados($scope.idProjetosAprovados,$scope.idProjetosReprovados)
			.success(function(data, status) {
				$scope.toast('Projeto(s) atualizado(s) com sucesso!','success-toast');
				// $scope.selectedo = false;
				var count = 0;
				if ($scope.idProjetosAprovados.length !== 0) {
					// for (var i = 0; i < $rootScope.projetos.length; i++) {
						// if ($rootScope.projetos[i]._id === $scope.details._id) {
							angular.forEach($rootScope.projetos, function (value, key) {
								for (var x = 0; x < $scope.idProjetosAprovados.length; x++) {
									if (value._id === $scope.idProjetosAprovados[x]) {
										$rootScope.projetos[count].aprovado = true;
									}
								}
								count++;
							});
						// }
					// }
					count = 0;
				}
				if ($scope.idProjetosReprovados.length !== 0) {
					// for (var i = 0; i < $rootScope.projetos.length; i++) {
						// if ($rootScope.projetos[i]._id === $scope.details._id) {
							angular.forEach($rootScope.projetos, function (value, key) {
								for (var x = 0; x < $scope.idProjetosReprovados.length; x++) {
									if (value._id === $scope.idProjetosReprovados[x]) {
										$rootScope.projetos[count].aprovado = false;
									}
								}
								count++;
							});
						// }
					// }
				}
			})
			.error(function(status) {
				console.log('Error: '+status);
			});
		}

		// $scope.ordenacao = ['categoria','eixo'];
		$scope.ordenarPor = function(campo) {
			$scope.ordenacao = campo;
		}

		$scope.query = 'nomeProjeto';
		$scope.setBusca = function(campo) {
			$scope.query = campo;
		}

		$timeout(function() {
			if (anoPersistido) {
				$rootScope.ano = anoPersistido;
			}
			carregarProjetos();
		});

	});
})();
