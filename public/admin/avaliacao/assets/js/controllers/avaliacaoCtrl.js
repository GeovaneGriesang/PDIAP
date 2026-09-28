(function(){
	'use strict';

	angular
	.module('PDIAPav')
	.controller('avaliacaoCtrl', function($scope, $rootScope, $mdDialog, avaliacaoAPI) {

		$rootScope.projetos = [];
		$scope.searchProject = "";

		let carregarProjetos = function() {
			$rootScope.projetos = [];
			avaliacaoAPI.getTodosProjetos()
			.then(function(response) {
				angular.forEach(response.data, function (value, key) {
					if (value.aprovado === true && avaliacaoAPI.pertenceAMostraAtual(value)) {
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
			}, function(response) {
				console.log(response.data);
			});
		};
		$scope.carregarProjetos = carregarProjetos;
		// Botão de atualizar (ícone de lupa antigo, ver avaliacao.html) - mesmo nome usado em
		// todo o resto do site pra recarregar os dados da tela sem precisar dar F5.
		$scope.recarregar = carregarProjetos;

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
					// Quantos avaliadores esta edição usa (ver models/feira-schema.js,
					// numAvaliadoresPorProjeto) - esta tela só lista projetos do ano corrente
					// (ver carregarProjetos acima), então é seguro assumir o mesmo ano aqui.
					// Assume 2 até a resposta chegar, pra não deixar o formulário em branco.
					$scope.numAvaliadoresRange = [0, 1];
					$scope.indiceDesempate = 2;
					avaliacaoAPI.getFeiras()
					.then(function(response) {
						var edicao = avaliacaoAPI.edicaoDaMostra(response.data);
						var n = (edicao && edicao.numAvaliadoresPorProjeto) || 2;
						var range = [];
						for (var i = 0; i < n; i++) range.push(i);
						$scope.numAvaliadoresRange = range;
						$scope.indiceDesempate = n;
					}, function(response) {
						console.log('Error: '+response.data);
					});
					$scope.addNotas = function(id,notas) {
						console.log(notas);
						avaliacaoAPI.putAvaliacao(id,notas)
						.then(function(response) {
							$scope.toast('Avaliação realizada com sucesso!','success-toast');
							var cont = 0, cont1 = 0;
							angular.forEach($rootScope.projetos, function (value, key) {
								cont++;
								if (value.numInscricao === $scope.details.numInscricao) {
									cont1 = cont;
									$rootScope.projetos[cont1-1].avaliado = true;
								}
							});
						}, function(response) {
							$scope.toast('Falha.','failed-toast');
							console.log('Error: '+response.data);
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
