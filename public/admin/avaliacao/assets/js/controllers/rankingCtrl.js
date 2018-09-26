(function(){
	'use strict';

	angular
	.module('PDIAPav')
	.controller('rankingCtrl', function($scope, $rootScope, $mdDialog, $filter, avaliacaoAPI) {

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

		$rootScope.ori_eixo1_1 = [];
		$rootScope.ori_eixo1_2 = [];
		$rootScope.ori_eixo1_3 = [];
		$rootScope.ori_eixo1_4 = [];
		$rootScope.ori_eixo2_1 = [];
		$rootScope.ori_eixo2_2 = [];
		$rootScope.ori_eixo2_3 = [];
		$rootScope.ori_eixo2_4 = [];
		$rootScope.ori_eixo1 = [];
		$rootScope.ori_eixo2 = [];
		$rootScope.ori_eixo3 = [];
		$rootScope.ori_eixo4 = [];
		$rootScope.ori_eixo5 = [];
		$rootScope.ori_eixo6 = [];
		$rootScope.ori_eixo7 = [];

		$rootScope.trouxas = [];
		$scope.searchProject = "";

		let carregarProjetos = function() {
			avaliacaoAPI.getTodosProjetos()
			.success(function(projetos) {
				angular.forEach(projetos, function (value, key) {
					var ano = new Date(value.createdAt).getFullYear();
					var ano_atual = new Date(Date.now()).getFullYear();
					if(ano == ano_atual){
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
                }
				});
                		$scope.reordenar();
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

		$scope.reordenar = function(){					
			$rootScope.ori_eixo1_1 = $filter('orderBy')($rootScope.eixo1_1,'-total',false);
			$rootScope.ori_eixo1_2 = $filter('orderBy')($rootScope.eixo1_2,'-total',false);
			$rootScope.ori_eixo1_3 = $filter('orderBy')($rootScope.eixo1_3,'-total',false);
			$rootScope.ori_eixo1_4 = $filter('orderBy')($rootScope.eixo1_4,'-total',false);

			$rootScope.ori_eixo2_1 = $filter('orderBy')($rootScope.eixo2_1,'-total',false);
			$rootScope.ori_eixo2_2 = $filter('orderBy')($rootScope.eixo2_2,'-total',false);
			$rootScope.ori_eixo2_3 = $filter('orderBy')($rootScope.eixo2_3,'-total',false);
			$rootScope.ori_eixo2_4 = $filter('orderBy')($rootScope.eixo2_4,'-total',false);

			$rootScope.ori_eixo1 = $filter('orderBy')($rootScope.eixo1,'-total',false);
			$rootScope.ori_eixo2 = $filter('orderBy')($rootScope.eixo2,'-total',false);
			$rootScope.ori_eixo3 = $filter('orderBy')($rootScope.eixo3,'-total',false);
			$rootScope.ori_eixo4 = $filter('orderBy')($rootScope.eixo4,'-total',false);
			$rootScope.ori_eixo5 = $filter('orderBy')($rootScope.eixo5,'-total',false);
			$rootScope.ori_eixo6 = $filter('orderBy')($rootScope.eixo6,'-total',false);
			$rootScope.ori_eixo7 = $filter('orderBy')($rootScope.eixo7,'-total',false);

			$rootScope.eixo1_1 = $rootScope.ori_eixo1_1; 
			$rootScope.eixo1_2 = $rootScope.ori_eixo1_2;
			$rootScope.eixo1_3 = $rootScope.ori_eixo1_3;
			$rootScope.eixo1_4 = $rootScope.ori_eixo1_4;
			$rootScope.eixo2_1 = $rootScope.ori_eixo2_1;
			$rootScope.eixo2_2 = $rootScope.ori_eixo2_2;
			$rootScope.eixo2_3 = $rootScope.ori_eixo2_3;
			$rootScope.eixo2_4 = $rootScope.ori_eixo2_4;
			$rootScope.eixo1 = $rootScope.ori_eixo1;
			$rootScope.eixo2 = $rootScope.ori_eixo2;
			$rootScope.eixo3 = $rootScope.ori_eixo3;
			$rootScope.eixo4 = $rootScope.ori_eixo4;
			$rootScope.eixo5 = $rootScope.ori_eixo5;
			$rootScope.eixo6 = $rootScope.ori_eixo6;
			$rootScope.eixo7 = $rootScope.ori_eixo7;
		}

		$scope.recarregar = function(filtro){
			if(filtro === 'nomeProjeto'){
				var eixo1_1 = [];
				var eixo1_2 = [];
				var eixo1_3 = [];
				var eixo1_4 = [];

				var eixo2_1 = [];
				var eixo2_2 = [];
				var eixo2_3 = [];
				var eixo2_4 = [];

				var eixo1 = [];
				var eixo2 = [];
				var eixo3 = [];
				var eixo4 = [];
				var eixo5 = [];
				var eixo6 = [];
				var eixo7 = [];
				for(var x=0; x<3;x++){
					eixo1_1.push($rootScope.eixo1_1[x]);					
					eixo1_2.push($rootScope.eixo1_2[x]);
					eixo1_3.push($rootScope.eixo1_3[x]);
					eixo1_4.push($rootScope.eixo1_4[x]);
					eixo2_1.push($rootScope.eixo2_1[x]);					
					eixo2_2.push($rootScope.eixo2_2[x]);
					eixo2_3.push($rootScope.eixo2_3[x]);
					eixo2_4.push($rootScope.eixo2_4[x]);
		
					eixo1.push($rootScope.eixo1[x]);
					eixo2.push($rootScope.eixo2[x]);
					eixo3.push($rootScope.eixo3[x]);
					eixo4.push($rootScope.eixo4[x]);
					eixo5.push($rootScope.eixo5[x]);
					eixo6.push($rootScope.eixo6[x]);
					eixo7.push($rootScope.eixo7[x]);
				}			
						
				if(eixo1_1[2] == null) eixo1_1[2] = {_id:null,total:0};
				if(eixo1_2[2] == null) eixo1_2[2] = {_id:null,total:0};
				if(eixo1_3[2] == null) eixo1_3[2] = {_id:null,total:0};
				if(eixo1_4[2] == null) eixo1_4[2] = {_id:null,total:0};

				if(eixo2_1[2] == null) eixo1_1[2] = {_id:null,total:0};
				if(eixo2_2[2] == null) eixo1_2[2] = {_id:null,total:0};
				if(eixo2_3[2] == null) eixo1_3[2] = {_id:null,total:0};
				if(eixo2_4[2] == null) eixo1_4[2] = {_id:null,total:0};

				if(eixo1[2] == null) eixo1[2] = {_id:null,total:0};
				if(eixo2[2] == null) eixo2[2] = {_id:null,total:0};
				if(eixo3[2] == null) eixo3[2] = {_id:null,total:0};
				if(eixo4[2] == null) eixo4[2] = {_id:null,total:0};
				if(eixo5[2] == null) eixo5[2] = {_id:null,total:0};
				if(eixo6[2] == null) eixo6[2] = {_id:null,total:0};
				if(eixo7[2] == null) eixo7[2] = {_id:null,total:0};			

				if(eixo1_1[1] == null) eixo1_1[1] = {_id:null,total:0};
				if(eixo1_2[1] == null) eixo1_2[1] = {_id:null,total:0};
				if(eixo1_3[1] == null) eixo1_3[1] = {_id:null,total:0};
				if(eixo1_4[1] == null) eixo1_4[1] = {_id:null,total:0};

				if(eixo2_1[1] == null) eixo1_1[1] = {_id:null,total:0};
				if(eixo2_2[1] == null) eixo1_2[1] = {_id:null,total:0};
				if(eixo2_3[1] == null) eixo1_3[1] = {_id:null,total:0};
				if(eixo2_4[1] == null) eixo1_4[1] = {_id:null,total:0};

				if(eixo1[1] == null) eixo1[1] = {_id:null,total:0};
				if(eixo2[1] == null) eixo2[1] = {_id:null,total:0};
				if(eixo3[1] == null) eixo3[1] = {_id:null,total:0};
				if(eixo4[1] == null) eixo4[1] = {_id:null,total:0};
				if(eixo5[1] == null) eixo5[1] = {_id:null,total:0};
				if(eixo6[1] == null) eixo6[1] = {_id:null,total:0};
				if(eixo7[1] == null) eixo7[1] = {_id:null,total:0};

				if(eixo1_1[0] == null) eixo1_1 = [];
				if(eixo1_2[0] == null) eixo1_2 = [];
				if(eixo1_3[0] == null) eixo1_3 = [];
				if(eixo1_4[0] == null) eixo1_4 = [];

				if(eixo2_1[0] == null) eixo1_1 = [];
				if(eixo2_2[0] == null) eixo1_2 = [];
				if(eixo2_3[0] == null) eixo1_3 = [];
				if(eixo2_4[0] == null) eixo1_4 = [];

				if(eixo1[0] == null) eixo1 = [];
				if(eixo2[0] == null) eixo2 = [];
				if(eixo3[0] == null) eixo3 = [];
				if(eixo4[0] == null) eixo4 = [];
				if(eixo5[0] == null) eixo5 = [];
				if(eixo6[0] == null) eixo6 = [];
				if(eixo7[0] == null) eixo7 = [];
				
				$rootScope.eixo1_1 = $filter('orderBy')(eixo1_1,filtro,false);
				$rootScope.eixo1_2 = $filter('orderBy')(eixo1_2,filtro,false);
				$rootScope.eixo1_3 = $filter('orderBy')(eixo1_3,filtro,false);
				$rootScope.eixo1_4 = $filter('orderBy')(eixo1_4,filtro,false);

				$rootScope.eixo2_1 = $filter('orderBy')(eixo2_1,filtro,false);
				$rootScope.eixo2_2 = $filter('orderBy')(eixo2_2,filtro,false);
				$rootScope.eixo2_3 = $filter('orderBy')(eixo2_3,filtro,false);
				$rootScope.eixo2_4 = $filter('orderBy')(eixo2_4,filtro,false);

				$rootScope.eixo1 = $filter('orderBy')(eixo1,filtro,false);
				$rootScope.eixo2 = $filter('orderBy')(eixo2,filtro,false);
				console.log("EIXO2:"+JSON.stringify($rootScope.eixo2));
				$rootScope.eixo3 = $filter('orderBy')(eixo3,filtro,false);
				$rootScope.eixo4 = $filter('orderBy')(eixo4,filtro,false);
				$rootScope.eixo5 = $filter('orderBy')(eixo5,filtro,false);
				$rootScope.eixo6 = $filter('orderBy')(eixo6,filtro,false);
				$rootScope.eixo7 = $filter('orderBy')(eixo7,filtro,false);
			} else {
				$rootScope.eixo1_1 = $filter('orderBy')($rootScope.ori_eixo1_1,filtro,false);
				$rootScope.eixo1_2 = $filter('orderBy')($rootScope.ori_eixo1_2,filtro,false);
				$rootScope.eixo1_3 = $filter('orderBy')($rootScope.ori_eixo1_3,filtro,false);
				$rootScope.eixo1_4 = $filter('orderBy')($rootScope.ori_eixo1_4,filtro,false);

				$rootScope.eixo2_1 = $filter('orderBy')($rootScope.ori_eixo2_1,filtro,false);
				$rootScope.eixo2_2 = $filter('orderBy')($rootScope.ori_eixo2_2,filtro,false);
				$rootScope.eixo2_3 = $filter('orderBy')($rootScope.ori_eixo2_3,filtro,false);
				$rootScope.eixo2_4 = $filter('orderBy')($rootScope.ori_eixo2_4,filtro,false);

				$rootScope.eixo1 = $filter('orderBy')($rootScope.ori_eixo1,filtro,false);
				$rootScope.eixo2 = $filter('orderBy')($rootScope.ori_eixo2,filtro,false);
				$rootScope.eixo3 = $filter('orderBy')($rootScope.ori_eixo3,filtro,false);
				$rootScope.eixo4 = $filter('orderBy')($rootScope.ori_eixo4,filtro,false);
				$rootScope.eixo5 = $filter('orderBy')($rootScope.ori_eixo5,filtro,false);
				$rootScope.eixo6 = $filter('orderBy')($rootScope.ori_eixo6,filtro,false);
				$rootScope.eixo7 = $filter('orderBy')($rootScope.ori_eixo7,filtro,false);
			}
			
			
		}
        
	});
})();
