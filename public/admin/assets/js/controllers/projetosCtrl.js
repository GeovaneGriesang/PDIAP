(function(){
	'use strict';

	angular
	.module('PDIAPa')
	.controller('projetosCtrl', function($scope, $rootScope, $q, $window, $mdDialog, $timeout, $filter, adminAPI) {

		$rootScope.projetos = [];
		$scope.searchProject = "";
		$scope.idAprovados = [];
		$scope.count = 0;

		$scope.year = CadastraAno();

		// O ano do filtro fica no $rootScope (em vez de $scope) para persistir ao navegar entre
		// "Selecionar aprovados", "Presença" e "Premiação" - as três usam este mesmo controller,
		// mas o ui-router recria a instância a cada troca de página, então um $scope.ano se
		// perderia a cada navegação. Sem seleção prévia nesta sessão, cai no ano atual.
		//
		// O valor persistido precisa ser guardado ANTES e reaplicado só depois de um $timeout:
		// o próprio <md-select>+ng-repeat de opções de ano, ao ser recriado do zero nesta troca
		// de página, religa cada <md-option> (2016, 2017, ..., ano atual) e no processo reescreve
		// o ng-model a cada uma (bug conhecido do Angular Material com ng-repeat dentro de
		// md-select), deixando o modelo travado no último ano da lista se não corrigirmos depois
		// que essa religação (síncrona) terminar.
		let anoPersistido = $rootScope.ano;
		$rootScope.ano = anoPersistido || new Date().getFullYear();

		// Mesmo esquema acima, pro critério e texto de busca: ficam em $rootScope pra
		// sobreviver à troca de página entre "Selecionar aprovados", "Presença" e
		// "Premiação". $scope.search aponta pro MESMO objeto de $rootScope.search (não
		// uma cópia), então digitar no campo já escreve direto no valor persistido, sem
		// precisar sincronizar os dois em toda tecla digitada.
		$rootScope.query = $rootScope.query || 'nomeProjeto';
		$rootScope.search = $rootScope.search || {};
		$scope.query = $rootScope.query;
		$scope.search = $rootScope.search;

		let countTotal = 0;
		$scope.hosp = [];
		let carregarProjetos = function() {
			adminAPI.getTodosProjetos()
			.success(function(projetos) {
				angular.forEach(projetos, function (value, key) {
					var ano = new Date(value.createdAt).getFullYear();
					if(ano == $rootScope.ano){
						// Achata integrantes em strings de busca (mesmo padrão de admin2Ctrl.js) pra
						// permitir filtrar por orientador/aluno no menu de busca - o filtro genérico
						// do Angular (filter:search) só alcança campos escalares de primeiro nível.
						let orientadores = "";
						let alunos = "";
						angular.forEach(value.integrantes, function (integrante) {
							if (integrante.tipo === 'Orientador') {
								orientadores = orientadores === "" ? integrante.nome : orientadores + ", " + integrante.nome;
							} else if (integrante.tipo === 'Aluno') {
								alunos = alunos === "" ? integrante.nome : alunos + ", " + integrante.nome;
							}
						});
						let obj = ({
							_id: value._id,
							numInscricao: value.numInscricao,
							nomeProjeto: value.nomeProjeto,
							nomeEscola: value.nomeEscola,
							cidade: value.cidade,
							estado: value.estado,
							categoria: value.categoria,
							eixo: value.eixo,
							palavraChave: value.palavraChave,
							hospedagem: value.hospedagem,
							orientadores: orientadores,
							alunos: alunos,
							aprovado: value.aprovado,
							tipoAprovacao: value.tipoAprovacao,
							modalidade: value.modalidade,
							participa: value.participa,
							integrantes: value.integrantes,
							createdAt: ano,
							premiacao: value.premiacao,
							mostratec: value.mostratec,
							feirasClassificadas: value.feirasClassificadas,
							colocacao: value.colocacao
						});
						// Valor do seletor de situação da tela de aprovados (3 estados).
						// Aprovado antigo, sem tipo gravado, aparece como "anais" - é a regra
						// combinada pras edições anteriores (ver scripts/importar-aprovacoes.js).
						obj.situacaoSelecionada = obj.aprovado === true
							? (obj.tipoAprovacao === 'apresentacao' ? 'apresentacao' : 'anais')
							: 'nao';
						$rootScope.projetos.push(obj);
						if (obj.aprovado === true) {
							$scope.count++;
						}
					}	
					
				});
			})
			.error(function(status) {
				console.log(status);
			});
		};
		$scope.carregarProjetos = carregarProjetos;

		// $scope.querySearch = function querySearch (query) {
		// 	let deferred = $q.defer();
		// 	return deferred;
		// }

		// $scope.count = 0;
		// $scope.contador = function(check,idProj) {
		// 	if (check) {
		// 		$scope.count--;
		// 		let index = $scope.idAprovados.indexOf(idProj);
		// 		$scope.idAprovados.splice(index, 1);
		// 	}
		// 	else {
		// 		$scope.count++;
		// 		$scope.idAprovados.push(idProj);
		// 	}
		// }

		// Três situações possíveis por projeto (ver models/projeto-schema.js): aprovado
		// pros anais, aprovado só pra apresentação, ou não aprovado. Cada uma tem sua
		// lista de ids pendentes de gravação.
		$scope.idProjetosAnais = [];
		$scope.idProjetosApresentacao = [];
		$scope.idProjetosReprovados = [];

		let listasSituacao = function() {
			return [$scope.idProjetosAnais, $scope.idProjetosApresentacao, $scope.idProjetosReprovados];
		};

		$scope.marcarSituacao = function(proj) {
			// Tira das três listas antes de recolocar: o admin pode trocar de ideia
			// várias vezes no mesmo projeto antes de salvar, e só a última escolha vale.
			listasSituacao().forEach(function(lista) {
				let index = lista.indexOf(proj._id);
				if (index !== -1) lista.splice(index, 1);
			});

			if (proj.situacaoSelecionada === 'anais') $scope.idProjetosAnais.push(proj._id);
			else if (proj.situacaoSelecionada === 'apresentacao') $scope.idProjetosApresentacao.push(proj._id);
			else $scope.idProjetosReprovados.push(proj._id);

			$scope.count = 0;
			angular.forEach($rootScope.projetos, function(p) {
				if (p.situacaoSelecionada === 'anais' || p.situacaoSelecionada === 'apresentacao') $scope.count++;
			});
		};

		// Habilita o botão Salvar. Antes era "count == 0", o que travava o salvamento
		// quando o admin só REPROVAVA projetos (nenhum aprovado selecionado).
		$scope.temAlteracoes = function() {
			return listasSituacao().some(function(lista) { return lista.length > 0; });
		};

		// Situação do projeto: as mesmas três cores em todas as telas (verde = anais,
		// laranja = somente apresentação, vermelho = não aprovado) - ver style.css.
		let chaveSituacao = function(proj) {
			if (proj.aprovado !== true) return 'nao';
			return proj.tipoAprovacao === 'apresentacao' ? 'apresentacao' : 'anais';
		};
		$scope.classeSituacao = function(proj) {
			return 'situacao-' + chaveSituacao(proj);
		};
		$scope.classeSelectSituacao = function(proj) {
			return 'select-situacao-' + (proj.situacaoSelecionada || chaveSituacao(proj));
		};
		$scope.rotuloCurtoSituacao = function(proj) {
			if (proj.aprovado !== true) return proj.aprovado === false ? 'Não aprovado' : 'Não avaliado';
			return proj.tipoAprovacao === 'apresentacao' ? 'Apresentação' : 'Anais e apresentação';
		};
		// Frases oficiais da lista de trabalhos aprovados, pro tooltip.
		$scope.rotuloSituacaoCompleto = function(proj) {
			if (proj.aprovado !== true) return proj.aprovado === false ? 'Não aprovado' : 'Ainda não avaliado';
			return proj.tipoAprovacao === 'apresentacao'
				? 'Aprovado somente para apresentação no evento'
				: 'Aprovado para apresentação e publicação nos anais';
		};

		// Filtro do cabeçalho por situação. 'aprovados' engloba os dois tipos; 'nao'
		// pega tanto o reprovado quanto o que ainda não foi avaliado.
		// Objeto (e não string solta) de propósito: com ng-model num primitivo, o
		// md-select escreve numa cópia no escopo filho e o filtro aqui continuaria lendo
		// o valor antigo - o filtro simplesmente não surtia efeito.
		$scope.filtroSit = { situacao: 'todos' };
		$scope.filtroPorSituacao = function(proj) {
			var filtro = $scope.filtroSit.situacao;
			if (!filtro || filtro === 'todos') return true;
			if (filtro === 'aprovados') return proj.aprovado === true;
			if (filtro === 'nao') return proj.aprovado !== true;
			return proj.aprovado === true && chaveSituacao(proj) === filtro;
		};

		$rootScope.recarregar = function(){
			$rootScope.projetos = [];
			$scope.searchProject = "";
			$scope.idAprovados = [];
			$scope.count = 0;
			$scope.idProjetosAnais = [];
			$scope.idProjetosApresentacao = [];
			$scope.idProjetosReprovados = [];
			$scope.year = CadastraAno();
			carregarProjetos();
		}

		// mostrarPresenca controla se a seção de marcar presença aparece no diálogo -
		// faz sentido na tela de Presença (padrão, true), mas não faz sentido em
		// Aprovados/Premiação, que rodam antes do dia do evento (ver aprovados.html).
		$scope.visualizarDetalhes = function(projeto,ev,mostrarPresenca) {
			$mdDialog.show({
				controller: function dialogController($scope, $rootScope, $mdDialog, $mdToast, $timeout, adminAPI) {
					$scope.details = projeto;
					$scope.mostrarPresenca = mostrarPresenca !== false;
					$scope.idIntegrantesPresentes = [];
					$scope.idIntegrantesAusentes = [];
					// let carregaIds = function() {
					// 	angular.forEach(projeto.integrantes, function (value, key) {
					// 		if (value.presenca === true) {
					// 			$scope.idIntegrantesPresentes.push(value._id);
					// 		}
					// 	});
					// 	console.log($scope.idIntegrantesPresentes);
					// }
					// carregaIds();
					$scope.contador1 = function(check,idIntegrante) {
						if (check) {
							let index = $scope.idIntegrantesPresentes.indexOf(idIntegrante);
							if (index !== -1) {
								$scope.idIntegrantesPresentes.splice(index, 1);
							}
							$scope.idIntegrantesAusentes.push(idIntegrante);
						}
						else {
							let index = $scope.idIntegrantesAusentes.indexOf(idIntegrante);
							if (index !== -1) {
								$scope.idIntegrantesAusentes.splice(index, 1);
							}
							$scope.idIntegrantesPresentes.push(idIntegrante);
						}
						// console.log("Presentes: "+$scope.idIntegrantesPresentes);
						// console.log("Ausentes: "+$scope.idIntegrantesAusentes);
					}
					$scope.setPresenca = function() {
						adminAPI.putPresencaProjetos($scope.idIntegrantesPresentes,$scope.idIntegrantesAusentes)
						.success(function(data, status) {
							$scope.toast('Presença cadastrada com sucesso!','success-toast');
							var count = 0;
							if ($scope.idIntegrantesPresentes.length !== 0) {
								for (var i = 0; i < $rootScope.projetos.length; i++) {
									if ($rootScope.projetos[i]._id === $scope.details._id) {
										angular.forEach($rootScope.projetos[i].integrantes, function (value, key) {
											count++;
											for (var x = 0; x < $scope.idIntegrantesPresentes.length; x++) {
												if (value._id === $scope.idIntegrantesPresentes[x]) {
													$rootScope.projetos[i].integrantes[count-1].presenca = true;
												}
											}
										});
									}
								}
							}
							count = 0;
							if ($scope.idIntegrantesAusentes.length !== 0) {
								for (var i = 0; i < $rootScope.projetos.length; i++) {
									if ($rootScope.projetos[i]._id === $scope.details._id) {
										angular.forEach($rootScope.projetos[i].integrantes, function (value, key) {
											count++;
											for (var x = 0; x < $scope.idIntegrantesAusentes.length; x++) {
												if (value._id === $scope.idIntegrantesAusentes[x]) {
													$rootScope.projetos[i].integrantes[count-1].presenca = false;
												}
											}
										});
									}
								}
							}
							$mdDialog.hide();
							$scope.idIntegrantesPresentes = [];
							$scope.idIntegrantesAusentes = [];
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
				templateUrl: 'admin/views/details.presenca_projetos.html',
				parent: angular.element(document.body),
				targetEvent: ev,
				clickOutsideToClose: false,
				fullscreen: true // Only for -xs, -sm breakpoints.
			});
		};

		$scope.visualizarDetalhesPremiacao = function(projeto,ev) {
			$mdDialog.show({
				controller: function dialogController($scope, $rootScope, $mdDialog, $mdToast, adminAPI) {
					$scope.details = projeto;
					$scope.premiacao = {_id:projeto._id};

					// Feiras aplicáveis a este projeto: só as cadastradas pro ano/categoria dele
					// (ver "Eventos > Cadastrar Feiras") - cada uma vira um checkbox independente
					// de Premiação/Menção Honrosa (details.premiacao.html).
					$scope.feirasDisponiveis = [];
					$scope.premiacao.feirasSelecionadas = {};
					adminAPI.getFeiras().success(function(feiras) {
						angular.forEach(feiras, function (feira) {
							if (feira.ano == $rootScope.ano && feira.categorias.indexOf(projeto.categoria) !== -1) {
								$scope.feirasDisponiveis.push(feira);
								if (projeto.feirasClassificadas && projeto.feirasClassificadas.indexOf(feira._id) !== -1) {
									$scope.premiacao.feirasSelecionadas[feira._id] = true;
								}
							}
						});
					});

					$scope.setPremiado = function() {
						$scope.premiacao.feirasClassificadas = Object.keys($scope.premiacao.feirasSelecionadas).filter(function(id) {
							return $scope.premiacao.feirasSelecionadas[id];
						});
						adminAPI.putPremiadoProjetos($scope.premiacao).success(function(data, status) {
							$scope.toast('Projeto premiado com sucesso!','success-toast');

							setTimeout($rootScope.recarregar, 750);
						}).error(function(status) {
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
				templateUrl: 'admin/views/details.premiacao.html',
				parent: angular.element(document.body),
				targetEvent: ev,
				clickOutsideToClose: false,
				fullscreen: true // Only for -xs, -sm breakpoints.
			});
		};

		$scope.update = function() {
			adminAPI.putSetAprovados($scope.idProjetosAnais, $scope.idProjetosApresentacao, $scope.idProjetosReprovados)
			.success(function(data, status) {
				$scope.toast('Projeto(s) atualizado(s) com sucesso!','success-toast');

				// Reflete na lista em memória o que acabou de ser gravado, sem recarregar
				// tudo do servidor.
				let aplicar = function(ids, aprovado, tipoAprovacao) {
					angular.forEach($rootScope.projetos, function(proj) {
						if (ids.indexOf(proj._id) !== -1) {
							proj.aprovado = aprovado;
							proj.tipoAprovacao = tipoAprovacao;
						}
					});
				};
				aplicar($scope.idProjetosAnais, true, 'anais');
				aplicar($scope.idProjetosApresentacao, true, 'apresentacao');
				aplicar($scope.idProjetosReprovados, false, undefined);

				$scope.idProjetosAnais = [];
				$scope.idProjetosApresentacao = [];
				$scope.idProjetosReprovados = [];
			})
			.error(function(status) {
				$scope.toast('Falha ao salvar.','failed-toast');
				console.log('Error: '+status);
			});
		}

		// Baixa em zip os relatórios (PDF) dos projetos aprovados. Sem filtro aplicado,
		// baixa todos os aprovados do ano; filtrando antes (categoria, orientador, etc.),
		// baixa só os que estão visíveis no momento - o servidor sempre garante que só
		// projetos aprovados entram no zip, mesmo que a lista visível mostre outros também.
		$scope.baixarZip = function() {
			var visiveis = $filter('filter')($rootScope.projetos, $scope.search || {});
			var ids = visiveis.map(function(p) { return p._id; });
			var url = adminAPI.getUrlZipRelatorios(ids, $rootScope.ano);
			$window.open(url, '_blank');
		};

		// $scope.ordenacao = ['categoria','eixo'];
		$scope.ordenarPor = function(campo) {
			$scope.ordenacao = campo;
		}

		$scope.setBusca = function(campo) {
			$scope.query = $rootScope.query = campo;
			// Limpa o texto do critério anterior - senão ele fica "preso" no objeto search
			// (o filtro genérico do Angular exige todas as chaves batendo ao mesmo tempo),
			// escondendo resultados do novo critério até a pessoa apagar o texto na mão.
			$scope.search = $rootScope.search = {};
		}

		$timeout(function() {
			if (anoPersistido) {
				$rootScope.ano = anoPersistido;
			}
			carregarProjetos();
		});

	});
})();
