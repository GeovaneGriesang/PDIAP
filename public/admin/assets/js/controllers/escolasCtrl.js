(function(){
	'use strict';

	angular
	.module('PDIAPa')
	.controller('escolasCtrl', function($scope, $mdDialog, $mdToast, adminAPI) {

		$scope.toast = function(message,tema) {
			var toast = $mdToast.simple().textContent(message).action('✖').position('top right').theme(tema).hideDelay(10000);
			$mdToast.show(toast);
		};

		$scope.pendentes = [];
		$scope.aprovadas = [];

		$scope.listaEstados = [];
		$scope.cidades = [];

		adminAPI.getEstados()
		.success(function(data) {
			$scope.listaEstados = data.estados;
		})
		.error(function(status) {
			console.log('Erro estados: '+status);
		});

		$scope.selectCidades = function(cid) {
			$scope.cidades = [];
			angular.forEach($scope.listaEstados, function(value) {
				if (cid === value.nome) {
					angular.forEach(value.cidades, function(c) { $scope.cidades.push(c); });
				}
			});
		};

		function separarPorStatus(lista) {
			$scope.pendentes = lista.filter(function(e) { return e.status === 'pendente'; })
				.sort(function(a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
			$scope.aprovadas = lista.filter(function(e) { return e.status === 'aprovada'; })
				.sort(function(a, b) { return (a.nome || '').localeCompare(b.nome || '', 'pt-BR'); });
		}

		$scope.mostraEscolas = function() {
			adminAPI.getEscolas()
			.success(function(escolas) {
				separarPorStatus(escolas);
			})
			.error(function(status) {
				console.log('Erro ao mostrar escolas: '+status);
			});
		};
		$scope.mostraEscolas();

		$scope.cadastrarEscola = function(escola) {
			adminAPI.postEscola(escola)
			.success(function() {
				$scope.toast('Escola cadastrada com sucesso!','success-toast');
				$scope.mostraEscolas();
				resetForm();
			})
			.error(function(status) {
				$scope.toast('Falha.','failed-toast');
				console.log('Erro: '+status);
			});
		};

		// Aprovar uma escola pendente: abre um diálogo com nome/cep/cidade/estado
		// pré-preenchidos, mas editáveis - quem solicitou pode ter digitado algo com
		// variação/erro, então dá pra corrigir no mesmo passo em que aprova.
		$scope.aprovarEscola = function(ev, escolaOriginal) {
			$mdDialog.show({
				controller: function dialogController($scope, $mdDialog) {
					$scope.escola = angular.copy(escolaOriginal);
					$scope.listaEstados = [];
					$scope.cidades = [];
					$scope.selectCidades = function(cid) {
						$scope.cidades = [];
						angular.forEach($scope.listaEstados, function(value) {
							if (cid === value.nome) {
								angular.forEach(value.cidades, function(c) { $scope.cidades.push(c); });
							}
						});
					};
					adminAPI.getEstados().success(function(data) {
						$scope.listaEstados = data.estados;
						$scope.selectCidades($scope.escola.estado);
					});
					$scope.confirmar = function() {
						$mdDialog.hide($scope.escola);
					};
					$scope.cancel = function() {
						$mdDialog.cancel();
					};
				},
				templateUrl: 'admin/views/details.aprovar-escola.html',
				parent: angular.element(document.body),
				targetEvent: ev,
				clickOutsideToClose: false
			}).then(function(escolaEditada) {
				adminAPI.aprovarEscola(escolaEditada)
				.success(function() {
					$scope.toast('Escola aprovada!','success-toast');
					$scope.mostraEscolas();
				})
				.error(function(status) {
					$scope.toast('Falha.','failed-toast');
					console.log('Erro: '+status);
				});
			}, function() {});
		};

		$scope.removerEscola = function(ev,id,nome) {
			var confirm = $mdDialog.confirm()
			.textContent('Deseja remover a escola '+nome+'?')
			.ariaLabel('Remover escola')
			.targetEvent(ev)
			.ok('Sim')
			.cancel('Não');
			$mdDialog.show(confirm).then(function() {
				adminAPI.removeEscola(id)
				.success(function() {
					$scope.toast('Escola removida com sucesso!','success-toast');
					$scope.mostraEscolas();
				})
				.error(function(status) {
					$scope.toast(status || 'Falha.','failed-toast');
					console.log('Erro: '+status);
				});
			}, function() {});
		};

		let resetForm = function() {
			delete $scope.escola;
			$scope.escolasForm.$setPristine();
			$scope.escolasForm.$setUntouched();
			$scope.cidades = [];
		};
	});
})();
