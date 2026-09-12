(function(){
	'use strict';

	// Painel de pendências de dados que o fluxo normal do site não força a resolver: um
	// projeto pode acabar avaliado sem presença confirmada, empatado sem ninguém notar (o
	// empate só aparece visualmente no Ranking), ou avaliado sem nunca ter sido marcado
	// aprovado/reprovado (avaliador avalia direto, sem passar por Selecionar Aprovados).
	// Cada aba reaproveita o MESMO mecanismo de edição das telas de origem (mesmos diálogos/
	// rotas), só que a lista já vem filtrada pra só quem está inconsistente, então dá pra
	// corrigir tudo aqui mesmo sem precisar ir cata a projeto nas telas de origem.
	angular
	.module('PDIAPa')
	.controller('inconsistenciasCtrl', function($scope, $rootScope, $mdDialog, $mdToast, adminAPI) {

		$scope.abaAtiva = 'semPresenca';
		$scope.year = CadastraAno();
		$rootScope.ano = $rootScope.ano || new Date().getFullYear();

		$scope.semPresenca = [];
		$scope.empatados = [];
		$scope.naoAprovado = [];

		// Mesma conta de "total" usada no Ranking (rankingCtrl.js#construirObjExibicao):
		// soma das notas, incluindo a de desempate (avaliacao[2]) quando já existir.
		function total(avaliacao) {
			if (!avaliacao || avaliacao.length === 0) return 0;
			return avaliacao[2] !== undefined ? avaliacao[0] + avaliacao[1] + avaliacao[2] : avaliacao[0] + avaliacao[1];
		}

		// Empate = 2+ projetos do mesmo categoria+eixo com a mesma pontuação total - só entre
		// quem já foi avaliado, já que quem não tem nota nenhuma não "empata" com ninguém.
		function detectarEmpatados(avaliados) {
			var porGrupo = {};
			avaliados.forEach(function(p) {
				var chave = p.categoria + '|' + p.eixo;
				(porGrupo[chave] = porGrupo[chave] || []).push(p);
			});
			var resultado = [];
			Object.keys(porGrupo).forEach(function(chave) {
				var porTotal = {};
				porGrupo[chave].forEach(function(p) {
					(porTotal[p._total] = porTotal[p._total] || []).push(p);
				});
				Object.keys(porTotal).forEach(function(t) {
					if (porTotal[t].length > 1) resultado = resultado.concat(porTotal[t]);
				});
			});
			return resultado;
		}

		let carregarProjetos = function() {
			$scope.semPresenca = [];
			$scope.naoAprovado = [];
			var avaliados = [];
			adminAPI.getTodosProjetos()
			.success(function(projetos) {
				angular.forEach(projetos, function(value) {
					var ano = new Date(value.createdAt).getFullYear();
					if (ano !== $rootScope.ano) return;
					var temNota = value.avaliacao !== undefined && value.avaliacao.length > 0;
					if (!temNota) return;

					var obj = {
						_id: value._id, numInscricao: value.numInscricao, nomeProjeto: value.nomeProjeto,
						nomeEscola: value.nomeEscola, categoria: value.categoria, eixo: value.eixo,
						estado: value.estado, cidade: value.cidade, palavraChave: value.palavraChave,
						hospedagem: value.hospedagem, integrantes: value.integrantes,
						avaliacao: value.avaliacao.slice(), aprovado: value.aprovado, tipoAprovacao: value.tipoAprovacao,
						participa: value.participa,
						_total: total(value.avaliacao)
					};
					obj.situacaoSelecionada = obj.aprovado === true
						? (obj.tipoAprovacao === 'apresentacao' ? 'apresentacao' : 'anais')
						: 'nao';

					if (value.aprovado === true && value.participa === undefined) {
						$scope.semPresenca.push(obj);
					}
					if (value.aprovado === true) {
						avaliados.push(obj);
					} else {
						$scope.naoAprovado.push(obj);
					}
				});
				$scope.empatados = detectarEmpatados(avaliados);
			})
			.error(function(status) { console.log(status); });
		};
		carregarProjetos();
		$scope.recarregar = carregarProjetos;

		$scope.toast = function(message, tema) {
			$mdToast.show($mdToast.simple().textContent(message).action('✖').position('top right').theme(tema).hideDelay(4000));
		};

		// --- Sem presença: mesmo diálogo/rota de Projetos > Presença (ver
		// projetosCtrl.js#visualizarDetalhes + details.presenca_projetos.html). ---
		$scope.abrirPresenca = function(projeto, ev) {
			$mdDialog.show({
				controller: function dialogController($scope, $mdDialog, $mdToast, adminAPI) {
					$scope.details = projeto;
					$scope.mostrarPresenca = true;
					$scope.idIntegrantesPresentes = [];
					$scope.idIntegrantesAusentes = [];
					$scope.contador1 = function(check, idIntegrante) {
						if (check) {
							var i = $scope.idIntegrantesPresentes.indexOf(idIntegrante);
							if (i !== -1) $scope.idIntegrantesPresentes.splice(i, 1);
							$scope.idIntegrantesAusentes.push(idIntegrante);
						} else {
							var i2 = $scope.idIntegrantesAusentes.indexOf(idIntegrante);
							if (i2 !== -1) $scope.idIntegrantesAusentes.splice(i2, 1);
							$scope.idIntegrantesPresentes.push(idIntegrante);
						}
					};
					$scope.setPresenca = function() {
						adminAPI.putPresencaProjetos($scope.idIntegrantesPresentes, $scope.idIntegrantesAusentes)
						.success(function() {
							$scope.toast('Presença cadastrada com sucesso!', 'success-toast');
							$mdDialog.hide();
							carregarProjetos();
						})
						.error(function(status) {
							$scope.toast('Falha.', 'failed-toast');
							console.log('Error: ' + status);
						});
					};
					$scope.toast = function(message, tema) {
						$mdToast.show($mdToast.simple().textContent(message).action('✖').position('top right').theme(tema).hideDelay(4000));
					};
					$scope.hide = function() { $mdDialog.hide(); };
					$scope.cancel = function() { $mdDialog.cancel(); };
				},
				templateUrl: 'admin/views/details.presenca_projetos.html',
				parent: angular.element(document.body),
				targetEvent: ev,
				clickOutsideToClose: false,
				fullscreen: true
			});
		};

		// --- Empatados: mesmo diálogo/rota de Avaliação > Inserir (ver
		// avaliacaoInserirCtrl.js#visualizarDetalhes + details.avaliacao.html). ---
		$scope.abrirDesempate = function(projeto, ev) {
			$mdDialog.show({
				controller: function dialogController($scope, $mdDialog, $mdToast, adminAPI) {
					$scope.details = projeto;
					$scope.desempate = false;
					$scope.habilitaDesempate = function() { $scope.desempate = !$scope.desempate; };
					$scope.addNotas = function(id, notas) {
						adminAPI.putAvaliacao(id, notas)
						.success(function() {
							$scope.toast('Avaliação realizada com sucesso!', 'success-toast');
							$mdDialog.hide();
							carregarProjetos();
						})
						.error(function(status) {
							$scope.toast('Falha.', 'failed-toast');
							console.log('Error: ' + status);
						});
					};
					$scope.toast = function(message, tema) {
						$mdToast.show($mdToast.simple().textContent(message).action('✖').position('top right').theme(tema).hideDelay(4000));
					};
					$scope.hide = function() { $mdDialog.hide(); };
					$scope.cancel = function() { $mdDialog.cancel(); };
				},
				templateUrl: 'admin/views/details.avaliacao.html',
				parent: angular.element(document.body),
				targetEvent: ev,
				clickOutsideToClose: false,
				fullscreen: true
			});
		};

		// --- Sem aprovação: mesmo seletor/rota de Projetos > Selecionar Aprovados (ver
		// projetosCtrl.js#marcarSituacao/update). Edição inline na lista, sem diálogo. ---
		$scope.idProjetosAnais = [];
		$scope.idProjetosApresentacao = [];
		$scope.idProjetosReprovados = [];
		function listasSituacao() {
			return [$scope.idProjetosAnais, $scope.idProjetosApresentacao, $scope.idProjetosReprovados];
		}
		$scope.marcarSituacao = function(proj) {
			listasSituacao().forEach(function(lista) {
				var i = lista.indexOf(proj._id);
				if (i !== -1) lista.splice(i, 1);
			});
			if (proj.situacaoSelecionada === 'anais') $scope.idProjetosAnais.push(proj._id);
			else if (proj.situacaoSelecionada === 'apresentacao') $scope.idProjetosApresentacao.push(proj._id);
			else $scope.idProjetosReprovados.push(proj._id);
		};
		$scope.temAlteracoesSituacao = function() {
			return listasSituacao().some(function(lista) { return lista.length > 0; });
		};
		$scope.classeSelectSituacao = function(proj) {
			return 'select-situacao-' + proj.situacaoSelecionada;
		};
		$scope.salvarSituacoes = function() {
			adminAPI.putSetAprovados($scope.idProjetosAnais, $scope.idProjetosApresentacao, $scope.idProjetosReprovados)
			.success(function() {
				$scope.toast('Projeto(s) atualizado(s) com sucesso!', 'success-toast');
				$scope.idProjetosAnais = [];
				$scope.idProjetosApresentacao = [];
				$scope.idProjetosReprovados = [];
				carregarProjetos();
			})
			.error(function(status) {
				$scope.toast('Falha ao salvar.', 'failed-toast');
				console.log('Error: ' + status);
			});
		};
	});
})();
