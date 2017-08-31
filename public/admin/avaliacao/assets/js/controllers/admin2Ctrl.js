(function(){
	'use strict';

	angular
	.module('PDIAPa')
	.controller('admin2Ctrl', function($scope, $rootScope, $mdDialog, adminAPI) { //adicionar importação de Projetos

		// $scope.projetos = new Projetos();

		$scope.projetos = [];
		$scope.saberes = [];
		$scope.avaliadores = [];

		// $scope.ordenacao = ['aprovado','participa'];
		// $scope.query = 'nomeProjeto';
		let relatorio = ({
			countAprovados: 0,
			countParticipaSim: 0,
			countParticipaNao: 0,
			countPendente: 0
		});
		console.log(relatorio);
		// let countAprovados = 0
		// , countParticipaSim = 0
		// , countParticipaNao = 0
		// , countPendente = 0;

		$scope.carregarProjetos = function() {
			adminAPI.getTodosProjetos()
			.success(function(projetos) {
				angular.forEach(projetos, function (value, key) {
					if (value.aprovado === true) {
						relatorio.countAprovados++;
						if (value.participa === true) {
							relatorio.countParticipaSim++;
						} else if(value.participa === false) {
							relatorio.countParticipaNao++;
						} else {
							relatorio.countPendente++;
						}
					}

					// let orientadores = [];
					// angular.forEach(value.integrantes, function (value, key) {
					// 	if (value.tipo === 'Orientador') {
					// 		orientadores.push(value.nome+' ('+value.telefone+')');
					// 	}
					// });
					let orientadores = "";
					let alunos = "";
					angular.forEach(value.integrantes, function (value, key) {
						if (value.tipo === 'Orientador') {
							if (orientadores !== "") {
								orientadores = orientadores+", "+value.nome+" ("+value.telefone+")";
							} else {
								orientadores = value.nome+" ("+value.telefone+")";
							}
						}
						if (value.tipo === 'Aluno') {
							if (alunos !== "") {
								alunos = alunos+", "+value.nome+" ("+value.telefone+")";
							} else {
								alunos = value.nome+" ("+value.telefone+")";
							}
						}
					});

					let obj = ({
						_id: value._id.$oid,
						numInscricao: value.numInscricao,
						nomeProjeto: value.nomeProjeto,
						nomeEscola: value.nomeEscola,
						categoria: value.categoria,
						eixo: value.eixo,
						orientadores: orientadores,
						alunos: alunos,
						resumo: value.resumo,
						aprovado: value.aprovado,
						participa: value.participa
					});
					$scope.projetos.push(obj);
				});
				console.log("aprovados: "+relatorio.countAprovados);
				console.log("nao: "+relatorio.countParticipaNao);
				console.log("sim: "+relatorio.countParticipaSim);
				console.log("pendente: "+relatorio.countPendente);
			})
			.error(function(status) {
				console.log(status);
			});
		};

		$scope.carregarSaberes = function() {
			adminAPI.getTodosSaberes()
			.success(function(saberes) {
				$scope.saberes = saberes;
				// console.log(saberes);
			})
			.error(function(status) {
				console.log(status);
			});
		};

		$scope.carregarAvaliadores = function() {
			adminAPI.getTodosAvaliadores()
			.success(function(avaliadores) {
				// angular.forEach(projetos, function (value, key) {
				// 	let obj = ({
				// 		_id: value._id.$oid,
				// 		numInscricao: value.numInscricao,
				// 		nomeProjeto: value.nomeProjeto,
				// 		nomeEscola: value.nomeEscola,
				// 		categoria: value.categoria,
				// 		eixo: value.eixo,
				// 		resumo: value.resumo
				// 	});
				// 	$scope.projetos.push(obj);
				// });
				$scope.avaliadores = avaliadores;
			})
			.error(function(status) {
				console.log(status);
			});
		};

		$scope.ordenarPor = function(campo) {
			$scope.ordenacao = campo;
		}
		$scope.setBusca = function(campo) {
			$scope.query = campo;
			delete $scope.search;
		}

		$scope.setarProjetos = function() {
			$scope.ordenacao = ['aprovado','participa'];
			$scope.query = 'nomeProjeto';
			$scope.textOrdenacao = [
				{text:'Aprovados',action:['aprovado','participa'],selected:true},
				{text:'Categoria/eixo',action:['categoria','eixo']},
				{text:'Nº de Inscrição',action:'numInscricao'},
				{text:'Nome do projeto',action:'nomeProjeto'},
				{text:'Escola',action:'nomeEscola'}
			];
			$scope.textQuery = [
				{text:'Nome do projeto',action:'nomeProjeto'},
				{text:'Escola',action:'nomeEscola'},
				{text:'Categoria',action:'categoria'},
				{text:'Eixo',action:'eixo'},
				{text:'Orientador',action:'orientadores'}
			];
		}
		$scope.setarSaberes = function() {
			$scope.ordenacao = 'nome';
			$scope.query = 'nome';
			$scope.textOrdenacao = [
				{text:'Nome',action:'nome',selected:true},
				{text:'Tipo',action:'tipo'},
				{text:'Escola',action:'escola'}
			];
			$scope.textQuery = [
				{text:'Nome',action:'nome'},
				{text:'Escola',action:'escola'},
				{text:'CPF',action:'cpf'},
				{text:'Email',action:'email'}
			];
		}
		$scope.setarAvaliadores = function() {
			$scope.ordenacao = ['categoria','eixo'];
			$scope.query = 'nome';
			$scope.textOrdenacao = [
				{text:'Categoria/eixo',action:['categoria','eixo'],selected:true},
				{text:'Nome',action:'nome'},
				{text:'Nível Acadêmico',action:'nivelAcademico'}
			];
			$scope.textQuery = [
				{text:'Nome',action:'nome'},
				{text:'CPF',action:'cpf'},
				{text:'Email',action:'email'},
				{text:'Atuação Pro.',action:'atuacaoProfissional'},
				{text:'Nível Acadêmico',action:'nivelAcademico'},
				{text:'Categoria',action:'categoria'},
				{text:'Eixo',action:'eixo'}
			];
		}

		$scope.visualizarDetalhes = function(projeto,ev) {
			$mdDialog.show({
				controller: function dialogController($scope, $mdDialog) {
					$scope.details = projeto;
					$scope.hide = function() {
						$mdDialog.hide();
					};
					$scope.cancel = function() {
						$mdDialog.cancel();
					};
				},
				templateUrl: 'admin/views/details.projetos.html',
				parent: angular.element(document.body),
				targetEvent: ev,
				clickOutsideToClose: false,
				fullscreen: true // Only for -xs, -sm breakpoints.
			});
		};

		$scope.visualizarDetalhes1 = function(saberes,ev) {
			$mdDialog.show({
				controller: function dialogController($scope, $mdDialog) {
					$scope.details = saberes;
					$scope.hide = function() {
						$mdDialog.hide();
					};
					$scope.cancel = function() {
						$mdDialog.cancel();
					};
				},
				templateUrl: 'admin/views/details.saberes.html',
				parent: angular.element(document.body),
				targetEvent: ev,
				clickOutsideToClose: false,
				fullscreen: true // Only for -xs, -sm breakpoints.
			});
		};

		$scope.visualizarDetalhes2 = function(avaliadores,ev) {
			$mdDialog.show({
				controller: function dialogController($scope, $mdDialog) {
					$scope.details = avaliadores;
					$scope.hide = function() {
						$mdDialog.hide();
					};
					$scope.cancel = function() {
						$mdDialog.cancel();
					};
				},
				templateUrl: 'admin/views/details.avaliadores.html',
				parent: angular.element(document.body),
				targetEvent: ev,
				clickOutsideToClose: false,
				fullscreen: true // Only for -xs, -sm breakpoints.
			});
		};

		$rootScope.relatorio = relatorio;
		$scope.visualizarRelatorio = function(ev) {
			$mdDialog.show({
				controller: function dialogController($scope, $rootScope, $mdDialog) {
					$scope.details = $rootScope.relatorio;
					$scope.hide = function() {
						$mdDialog.hide();
					};
					$scope.cancel = function() {
						$mdDialog.cancel();
					};
				},
				templateUrl: 'admin/views/relatorios.html',
				parent: angular.element(document.body),
				targetEvent: ev,
				clickOutsideToClose: false,
				fullscreen: true // Only for -xs, -sm breakpoints.
			});
		};

		$scope.setarProjetos();
		$scope.carregarProjetos();
		$scope.carregarSaberes();
		$scope.carregarAvaliadores();

	});
})();
