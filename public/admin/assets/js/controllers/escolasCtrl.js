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

		// Busca nas duas listas por nome, cidade, estado ou CEP, sem diferenciar acento nem
		// maiúsculas (CEP também sem ponto/traço).
		$scope.busca = { texto: '' };
		var normalizar = function(t) { return (t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };
		$scope.filtroEscola = function(esc) {
			var termos = normalizar($scope.busca.texto).split(/\s+/).filter(Boolean);
			if (!termos.length) return true;
			var alvo = normalizar([esc.nome, esc.cidade, esc.estado, esc.cep, (esc.cep || '').replace(/\D/g, '')].join(' '));
			return termos.every(function(t) { return alvo.indexOf(t) !== -1; });
		};

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

		// Aprovar uma escola pendente como está (os dados já aparecem na lista); pra corrigir
		// algo antes, "Editar" salva e ela continua pendente.
		$scope.aprovarEscola = function(ev, escolaOriginal) {
			var confirm = $mdDialog.confirm()
			.title('Aprovar a escola?')
			.textContent(escolaOriginal.nome + ' passa a aparecer na lista de escolas da inscrição de projetos.')
			.ariaLabel('Aprovar escola')
			.targetEvent(ev)
			.ok('Aprovar')
			.cancel('Cancelar');
			$mdDialog.show(confirm).then(function() {
				adminAPI.aprovarEscola(escolaOriginal)
				.then(function() {
					$scope.toast('Escola aprovada!', 'success-toast');
					$scope.mostraEscolas();
				}, function(response) {
					$scope.toast('Falha.','failed-toast');
					console.log('Erro: '+response.data);
				});
			}, function() {});
		};

		// Corrigir os dados de uma escola pendente sem aprovar ainda.
		$scope.editarEscola = function(ev, escolaOriginal) {
			abrirDialogEscola(ev, escolaOriginal, 'editar');
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
