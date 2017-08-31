(function(){
	'use strict';

	angular
	.module('PDIAPav')
	.controller('rankingCtrl', function($scope, $rootScope, $mdDialog, avaliacaoAPI) {

		$rootScope.projetos = [];
		$rootScope.eixo1_1 = [];
		$rootScope.eixo1_2 = [];
		$rootScope.eixo1_3 = [];
		$rootScope.eixo1_4 = [];
		$rootScope.eixo2_1 = [];
		$rootScope.eixo2_2 = [];
		$rootScope.eixo2_3 = [];
		$rootScope.eixo2_4 = [];
		$rootScope.eixo1 = [];
		$rootScope.eixo2 = [];
		$rootScope.eixo3 = [];
		$rootScope.eixo4 = [];
		$rootScope.eixo5 = [];
		$rootScope.eixo6 = [];
		$rootScope.eixo7 = [];
		$rootScope.trouxas = [];
		$scope.searchProject = "";

		let carregarProjetos = function() {
			avaliacaoAPI.getTodosProjetos()
			.success(function(projetos) {
				angular.forEach(projetos, function (value, key) {
					if (value.aprovado === true && (value.avaliacao !== undefined || value.participa === true)) {
						if (value.categoria === 'Fundamental I (1º ao 5º anos)') {
							if (value.avaliacao !== undefined && value.avaliacao.length > 0) {
								if (value.avaliacao[2] !== undefined) {
									var total = value.avaliacao[0]+value.avaliacao[1]+value.avaliacao[2];
								} else {
									var total = value.avaliacao[0]+value.avaliacao[1];
								}
							} else {
								var total = 0;
								value.avaliacao = undefined;
							}
							let orientadores = "";
							let alunos = "";
							angular.forEach(value.integrantes, function (value, key) {
								if (value.tipo === 'Orientador') {
									if (orientadores !== "") {
										orientadores = orientadores+", "+value.nome;
									} else {
										orientadores = value.nome;
									}
								}
								if (value.tipo === 'Aluno') {
									if (alunos !== "") {
										alunos = alunos+", "+value.nome;
									} else {
										alunos = value.nome;
									}
								}
							});
							let obj = ({
								_id: value._id,
								numInscricao: value.numInscricao,
								nomeProjeto: value.nomeProjeto,
								nomeEscola: value.nomeEscola,
								categoria: value.categoria,
								eixo: value.eixo,
								orientadores: orientadores,
								alunos: alunos,
								avaliacao: value.avaliacao,
								total: total
							});

							switch(value.eixo) {
								case 'Ciências da Natureza e suas tecnologias':
								$rootScope.eixo1_1.push(obj);
								break;
								case 'Ciências Humanas e suas tecnologias':
								$rootScope.eixo1_2.push(obj);
								break;
								case 'Linguagens, Códigos e suas tecnologias':
								$rootScope.eixo1_3.push(obj);
								break;
								case 'Matemática e suas tecnologias':
								$rootScope.eixo1_4.push(obj);
								break;
								default:
								// default code block
							}
						} else if (value.categoria === 'Fundamental II (6º ao 9º anos)') {
							if (value.avaliacao !== undefined && value.avaliacao.length > 0) {
								if (value.avaliacao[2] !== undefined) {
									var total = value.avaliacao[0]+value.avaliacao[1]+value.avaliacao[2];
								} else {
									var total = value.avaliacao[0]+value.avaliacao[1];
								}
							} else {
								var total = 0;
								value.avaliacao = undefined;
							}
							let orientadores = "";
							let alunos = "";
							angular.forEach(value.integrantes, function (value, key) {
								if (value.tipo === 'Orientador') {
									if (orientadores !== "") {
										orientadores = orientadores+", "+value.nome;
									} else {
										orientadores = value.nome;
									}
								}
								if (value.tipo === 'Aluno') {
									if (alunos !== "") {
										alunos = alunos+", "+value.nome;
									} else {
										alunos = value.nome;
									}
								}
							});
							let obj = ({
								_id: value._id,
								numInscricao: value.numInscricao,
								nomeProjeto: value.nomeProjeto,
								nomeEscola: value.nomeEscola,
								categoria: value.categoria,
								eixo: value.eixo,
								orientadores: orientadores,
								alunos: alunos,
								avaliacao: value.avaliacao,
								total: total
							});

							switch(value.eixo) {
								case 'Ciências da Natureza e suas tecnologias':
								$rootScope.eixo2_1.push(obj);
								break;
								case 'Ciências Humanas e suas tecnologias':
								$rootScope.eixo2_2.push(obj);
								break;
								case 'Linguagens, Códigos e suas tecnologias':
								$rootScope.eixo2_3.push(obj);
								break;
								case 'Matemática e suas tecnologias':
								$rootScope.eixo2_4.push(obj);
								break;
								default:
								// default code block
							}
						} else if (value.categoria === 'Ensino Médio, Técnico e Superior') {
							if (value.avaliacao !== undefined && value.avaliacao.length > 0) {
								if (value.avaliacao[2] !== undefined) {
									var total = value.avaliacao[0]+value.avaliacao[1]+value.avaliacao[2];
								} else {
									var total = value.avaliacao[0]+value.avaliacao[1];
								}
							} else {
								var total = 0;
								value.avaliacao = undefined;
							}
							let orientadores = "";
							let alunos = "";
							angular.forEach(value.integrantes, function (value, key) {
								if (value.tipo === 'Orientador') {
									if (orientadores !== "") {
										orientadores = orientadores+", "+value.nome;
									} else {
										orientadores = value.nome;
									}
								}
								if (value.tipo === 'Aluno') {
									if (alunos !== "") {
										alunos = alunos+", "+value.nome;
									} else {
										alunos = value.nome;
									}
								}
							});
							let obj = ({
								_id: value._id,
								numInscricao: value.numInscricao,
								nomeProjeto: value.nomeProjeto,
								nomeEscola: value.nomeEscola,
								categoria: value.categoria,
								eixo: value.eixo,
								orientadores: orientadores,
								alunos: alunos,
								avaliacao: value.avaliacao,
								total: total
							});
							$rootScope.projetos.push(obj);

							switch(value.eixo) {
								case 'Ciências Agrárias, Exatas e da Terra':
								$rootScope.eixo1.push(obj);
								break;
								case 'Ciências Ambientais, Biológicas e da Saúde':
								$rootScope.eixo2.push(obj);
								break;
								case 'Ciências Humanas e Sociais Aplicadas':
								$rootScope.eixo3.push(obj);
								break;
								case 'Línguas e Artes':
								$rootScope.eixo4.push(obj);
								break;
								case 'Extensão':
								$rootScope.eixo5.push(obj);
								break;
								case 'Ciências da Computação':
								$rootScope.eixo6.push(obj);
								break;
								case 'Engenharias':
								$rootScope.eixo7.push(obj);
								break;
								default:
								// default code block
							}
						}

					} else if(value.aprovado === true) {
						if (value.avaliacao !== undefined && value.avaliacao.length > 0) {
							if (value.avaliacao[2] !== undefined) {
								var total = value.avaliacao[0]+value.avaliacao[1]+value.avaliacao[2];
							} else {
								var total = value.avaliacao[0]+value.avaliacao[1];
							}
						} else {
							var total = 0;
							value.avaliacao = undefined;
						}
						let orientadores = "";
						let alunos = "";
						angular.forEach(value.integrantes, function (value, key) {
							if (value.tipo === 'Orientador') {
								if (orientadores !== "") {
									orientadores = orientadores+", "+value.nome;
								} else {
									orientadores = value.nome;
								}
							}
							if (value.tipo === 'Aluno') {
								if (alunos !== "") {
									alunos = alunos+", "+value.nome;
								} else {
									alunos = value.nome;
								}
							}
						});
						let obj = ({
							_id: value._id,
							numInscricao: value.numInscricao,
							nomeProjeto: value.nomeProjeto,
							nomeEscola: value.nomeEscola,
							categoria: value.categoria,
							eixo: value.eixo,
							orientadores: orientadores,
							alunos: alunos,
							avaliacao: value.avaliacao,
							total: total
						});
						$rootScope.trouxas.push(obj);
					}
				});
			})
			.error(function(status) {
				console.log(status);
			});
		};
		$scope.carregarProjetos = carregarProjetos;

		$scope.visualizarDetalhes = function(projeto,ev) {
			$mdDialog.show({
				controller: function dialogController($scope, $rootScope, $mdDialog, $mdToast, avaliacaoAPI) {
					$scope.details = projeto;
					// $scope.desempate = false;
					// $scope.habilitaDesempate = function() {
					// 	$scope.desempate = !$scope.desempate;
					// }
					// $scope.addNotas = function(id,notas) {
					// 	console.log(notas);
					// 	avaliacaoAPI.putAvaliacao(id,notas)
					// 	.success(function(data, status) {
					// 		$scope.toast('Avaliação realizada com sucesso!','success-toast');
					// 		var cont = 0, cont1 = 0;
					// 		angular.forEach($rootScope.projetos, function (value, key) {
					// 			cont++;
					// 			if (value.numInscricao === $scope.details.numInscricao) {
					// 				cont1 = cont;
					// 				$rootScope.projetos[cont1-1].avaliado = true;
					// 			}
					// 		});
					// 	})
					// 	.error(function(status) {
					// 		$scope.toast('Falha.','failed-toast');
					// 		console.log('Error: '+status);
					// 	});
					// }
					// $scope.toast = function(message,tema) {
					// 	var toast = $mdToast.simple().textContent(message).action('✖').position('top right').theme(tema).hideDelay(4000);
					// 	$mdToast.show(toast);
					// };
					$scope.hide = function() {
						$mdDialog.hide();
					};
					$scope.cancel = function() {
						$mdDialog.cancel();
					};
				},
				templateUrl: 'admin/avaliacao/views/details.ranking.html',
				parent: angular.element(document.body),
				targetEvent: ev,
				clickOutsideToClose: false,
				fullscreen: true // Only for -xs, -sm breakpoints.
			});
		};

		// $rootScope.ordenacao = ['categoria','eixo'];
		// $rootScope.ordenarPor = function(campo) {
		// 	$rootScope.ordenacao = campo;
		// }

		$scope.query = 'nomeProjeto';
		$scope.setBusca = function(campo) {
			$scope.query = campo;
		}

		carregarProjetos();

	});
})();
