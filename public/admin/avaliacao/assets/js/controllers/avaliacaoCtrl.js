(function(){
	'use strict';

	angular
	.module('PDIAPav')
	.controller('avaliacaoCtrl', function($scope, $rootScope, $mdDialog, avaliacaoAPI) {

		$rootScope.projetos = [];
		$scope.searchProject = "";

		let carregarProjetos = function() {
			avaliacaoAPI.getTodosProjetos()
			.success(function(projetos) {
				angular.forEach(projetos, function (value, key) {
					if (value.aprovado === true) {
						if (value.avaliacao !== undefined && value.avaliacao.length > 0) {
							var avaliacao = value.avaliacao;
							var avaliado = true;
						} else {
							var avaliacao = [];
							var avaliado = false;
						}
						let obj = ({
							_id: value._id,
							numInscricao: value.numInscricao,
							nomeProjeto: value.nomeProjeto,
							nomeEscola: value.nomeEscola,
							categoria: value.categoria,
							eixo: value.eixo,
							avaliacao: avaliacao,
							avaliado: avaliado
						});
						$rootScope.projetos.push(obj);
					}
				});
			})
			.error(function(status) {
				console.log(status);
			});
		};
		$scope.carregarProjetos = carregarProjetos;

		// $scope.querySearch = function querySearch(query) {
		// 	let deferred = $q.defer();
		// 	return deferred;
		// }

		$scope.visualizarDetalhes = function(projeto,ev) {
			$mdDialog.show({
				controller: function dialogController($scope, $rootScope, $mdDialog, $mdToast, avaliacaoAPI) {
					$scope.details = projeto;
					$scope.desempate = false;
					$scope.habilitaDesempate = function() {
						$scope.desempate = !$scope.desempate;
					}
					$scope.addNotas = function(id,notas) {
						console.log(notas);
						avaliacaoAPI.putAvaliacao(id,notas)
						.success(function(data, status) {
							$scope.toast('Avaliação realizada com sucesso!','success-toast');
							var cont = 0, cont1 = 0;
							angular.forEach($rootScope.projetos, function (value, key) {
								cont++;
								if (value.numInscricao === $scope.details.numInscricao) {
									cont1 = cont;
									$rootScope.projetos[cont1-1].avaliado = true;
								}
							});
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
				templateUrl: 'admin/avaliacao/views/details.projetos.html',
				parent: angular.element(document.body),
				targetEvent: ev,
				clickOutsideToClose: false,
				fullscreen: true // Only for -xs, -sm breakpoints.
			});
		};

		$rootScope.ordenacao = ['categoria','eixo'];
		$rootScope.ordenarPor = function(campo) {
			$rootScope.ordenacao = campo;
		}

		$scope.query = 'nomeProjeto';
		$scope.setBusca = function(campo) {
			$scope.query = campo;
		}

		carregarProjetos();

	});
})();
