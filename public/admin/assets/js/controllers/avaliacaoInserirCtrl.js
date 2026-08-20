(function(){
	'use strict';

	angular
	.module('PDIAPa')
	.controller('avaliacaoInserirCtrl', function($scope, $rootScope, $mdDialog, adminAPI) {

		$scope.projetos = [];
		$scope.searchProject = "";
		$scope.year = CadastraAno();

		// O ano do filtro fica no $rootScope pra seguir o mesmo padrão das outras telas
		// (Selecionar aprovados/Presença/Premiação) - sem seleção prévia, cai no ano atual.
		let anoPersistido = $rootScope.ano;
		$rootScope.ano = anoPersistido || new Date().getFullYear();

		let carregarProjetos = function() {
			$scope.projetos = [];
			adminAPI.getTodosProjetos()
			.success(function(projetos) {
				angular.forEach(projetos, function (value, key) {
					var ano = new Date(value.createdAt).getFullYear();
					if (value.aprovado === true && ano == $rootScope.ano) {
						var avaliacao = (value.avaliacao !== undefined && value.avaliacao.length > 0) ? value.avaliacao : [];
						let obj = ({
							_id: value._id,
							numInscricao: value.numInscricao,
							nomeProjeto: value.nomeProjeto,
							nomeEscola: value.nomeEscola,
							categoria: value.categoria,
							eixo: value.eixo,
							avaliacao: avaliacao,
							avaliado: avaliacao.length > 0
						});
						$scope.projetos.push(obj);
					}
				});
			})
			.error(function(status) {
				console.log(status);
			});
		};
		$scope.carregarProjetos = carregarProjetos;

		$scope.recarregar = function() {
			carregarProjetos();
		};

		$scope.visualizarDetalhes = function(projeto,ev) {
			$mdDialog.show({
				controller: function dialogController($scope, $mdDialog, $mdToast, adminAPI) {
					$scope.details = projeto;
					$scope.desempate = false;
					$scope.habilitaDesempate = function() {
						$scope.desempate = !$scope.desempate;
					};
					$scope.addNotas = function(id,notas) {
						adminAPI.putAvaliacao(id,notas)
						.success(function(data, status) {
							$scope.toast('Avaliação realizada com sucesso!','success-toast');
							$mdDialog.hide();
							carregarProjetos();
						})
						.error(function(status) {
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
				templateUrl: 'admin/views/details.avaliacao.html',
				parent: angular.element(document.body),
				targetEvent: ev,
				clickOutsideToClose: false,
				fullscreen: true // Only for -xs, -sm breakpoints.
			});
		};

		$scope.ordenacao = ['categoria','eixo'];
		$scope.ordenarPor = function(campo) {
			$scope.ordenacao = campo;
		};

		$scope.query = 'nomeProjeto';
		$scope.setBusca = function(campo) {
			$scope.query = campo;
		};

		carregarProjetos();
	});
})();
