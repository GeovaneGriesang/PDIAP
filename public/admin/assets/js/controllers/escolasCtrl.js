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
		.then(function(response) {
			$scope.listaEstados = response.data.estados;
		}, function(response) {
			console.log('Erro estados: '+response.data);
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
			.then(function(response) {
				separarPorStatus(response.data);
			}, function(response) {
				console.log('Erro ao mostrar escolas: '+response.data);
			});
		};
		$scope.mostraEscolas();

		$scope.cadastrarEscola = function(escola) {
			adminAPI.postEscola(escola)
			.then(function() {
				$scope.toast('Escola cadastrada com sucesso!','success-toast');
				$scope.mostraEscolas();
				resetForm();
			}, function(response) {
				$scope.toast('Falha.','failed-toast');
				console.log('Erro: '+response.data);
			});
		};

		// Diálogo compartilhado por "aprovar" (escola pendente) e "editar" (escola já
		// aprovada) - mesmos campos (nome/cep/cidade/estado), só muda o texto/botão e
		// qual API é chamada ao confirmar.
		function abrirDialogEscola(ev, escolaOriginal, modo) {
			$mdDialog.show({
				controller: function dialogController($scope, $mdDialog) {
					$scope.escola = angular.copy(escolaOriginal);
					$scope.modoAprovar = modo === 'aprovar';
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
					adminAPI.getEstados().then(function(response) {
						$scope.listaEstados = response.data.estados;
						$scope.selectCidades($scope.escola.estado);
					}, function(response) {
						console.log('Erro estados: '+response.data);
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
				var chamada = modo === 'aprovar' ? adminAPI.aprovarEscola(escolaEditada) : adminAPI.editarEscola(escolaEditada);
				chamada
				.then(function() {
					$scope.toast(modo === 'aprovar' ? 'Escola aprovada!' : 'Escola atualizada!', 'success-toast');
					$scope.mostraEscolas();
				}, function(response) {
					$scope.toast('Falha.','failed-toast');
					console.log('Erro: '+response.data);
				});
			}, function() {});
		}

		// Aprovar uma escola pendente: abre um diálogo com nome/cep/cidade/estado
		// pré-preenchidos, mas editáveis - quem solicitou pode ter digitado algo com
		// variação/erro, então dá pra corrigir no mesmo passo em que aprova.
		$scope.aprovarEscola = function(ev, escolaOriginal) {
			abrirDialogEscola(ev, escolaOriginal, 'aprovar');
		};

		// Editar uma escola já aprovada (corrigir nome/cidade/estado/cep depois do
		// fato, sem precisar apagar e recadastrar).
		$scope.editarEscolaAprovada = function(ev, escolaOriginal) {
			abrirDialogEscola(ev, escolaOriginal, 'editar');
		};

		// Rejeitar uma solicitação pendente: exige motivo (obrigatório) e avisa quem
		// solicitou por e-mail, se informado - diferente de removerEscola, que só se
		// aplica a uma escola já aprovada.
		$scope.rejeitarEscola = function(ev, escolaOriginal) {
			$mdDialog.show({
				controller: function dialogController($scope, $mdDialog) {
					$scope.escola = escolaOriginal;
					$scope.motivo = '';
					$scope.confirmar = function() {
						$mdDialog.hide($scope.motivo);
					};
					$scope.cancel = function() {
						$mdDialog.cancel();
					};
				},
				templateUrl: 'admin/views/details.rejeitar-escola.html',
				parent: angular.element(document.body),
				targetEvent: ev,
				clickOutsideToClose: false
			}).then(function(motivo) {
				adminAPI.rejeitarEscola(escolaOriginal._id, motivo)
				.then(function() {
					$scope.toast('Solicitação rejeitada.','success-toast');
					$scope.mostraEscolas();
				}, function(response) {
					$scope.toast(response.data || 'Falha.','failed-toast');
					console.log('Erro: '+response.data);
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
				.then(function() {
					$scope.toast('Escola removida com sucesso!','success-toast');
					$scope.mostraEscolas();
				}, function(response) {
					$scope.toast(response.data || 'Falha.','failed-toast');
					console.log('Erro: '+response.data);
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
