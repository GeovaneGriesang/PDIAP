(function(){
	'use strict';

	// Categorias e eixos do Ranking vêm da MOSTRA (Feira.categoriasEixos da edição - ver
	// avaliacaoAPI.edicaoDaMostra), não mais de uma lista fixa no código: a XI MOVACI, por
	// exemplo, separou "Ensino Médio e Técnico" de "Ensino Superior", e com a lista fixa todo
	// projeto de categoria/eixo fora dela sumia do ranking sem aviso (já acontecia com projetos do
	// Ensino Médio inscritos em eixos do Fundamental). Categoria ou eixo de projeto que não está
	// na Mostra ganha uma seção própria, marcada "fora da lista da Mostra", em vez de sumir.
	//
	// $scope.categorias = [{ nome, foraDaMostra, eixos: [{ nome, foraDaMostra, todos, ordenados,
	// visiveis }], geral, premiados }] - ordenados = por nota (base dos PDFs, empates e premiados);
	// visiveis = o que a aba mostra no modo de ranqueamento escolhido.

	// Marca (proj.empatado = true) quem está empatado numa pontuação que afeta o pódio -
	// tanto empates dentro do 1º-3º quanto um 4º colocado (ou mais abaixo) empatado com o
	// 3º, que também precisa aparecer pra ajudar no desempate. Empate abaixo dessa faixa
	// (ex: 5º empatado com 6º) não importa pro resultado e não é destacado. `lista` já
	// vem ordenada por -total.
	function marcarEmpates(lista) {
		if (!lista || lista.length === 0) return;
		var corte = lista.length >= 3 ? lista[2].total : lista[lista.length - 1].total;
		var contagem = {};
		lista.forEach(function(p) {
			if (p.total >= corte) contagem[p.total] = (contagem[p.total] || 0) + 1;
		});
		lista.forEach(function(p) {
			p.empatado = p.total >= corte && contagem[p.total] > 1;
		});
	}

	angular
	.module('PDIAPav')
	.controller('rankingCtrl', function($scope, $rootScope, $mdDialog, $filter, avaliacaoAPI, relatorioPdfService) {

		// Guia (barra de abas) controlada na mão via ng-show, não <md-tabs> - ver comentário
		// no <style> de ranking.html sobre por que (conflito entre md-dynamic-height e o
		// cabeçalho fixo/sticky). Abas: 'cat<i>' e 'geral<i>' por categoria, 'feiras', 'mencaoHonrosa'.
		$scope.abaAtiva = 'cat0';
		// '-total' (por nota) ou 'nomeProjeto' (os 3 primeiros de cada eixo em ordem alfabética, sem
		// revelar a colocação) - seletor "Ranqueamento" da toolbar.
		$scope.rank = '-total';
		$scope.categorias = [];
		$scope.totalPremiadosGeral = 0;

		$rootScope.mencaoHonrosa = [];
		$rootScope.feirasComProjetos = [];
		$scope.searchProject = "";

		// Constrói o objeto de exibição comum (total da nota + orientadores/alunos já
		// concatenados) uma vez só por projeto.
		function construirObjExibicao(value) {
			var total;
			if (value.avaliacao !== undefined && value.avaliacao.length > 0) {
				// Soma todas as notas presentes (2, 3 ou mais avaliadores, +desempate se
				// houver) - ver models/feira-schema.js, numAvaliadoresPorProjeto.
				total = value.avaliacao.reduce(function(a, b) { return a + (Number(b) || 0); }, 0);
				total = Math.round(total * 100) / 100;
			} else {
				total = 0;
				value.avaliacao = undefined;
			}
			var orientadores = "";
			var alunos = "";
			angular.forEach(value.integrantes, function (integrante) {
				if (integrante.tipo === 'Orientador') {
					orientadores = orientadores === "" ? integrante.nome : orientadores+", "+integrante.nome;
				}
				if (integrante.tipo === 'Aluno') {
					alunos = alunos === "" ? integrante.nome : alunos+", "+integrante.nome;
				}
			});
			return {
				_id: value._id,
				numInscricao: value.numInscricao,
				nomeProjeto: value.nomeProjeto,
				nomeEscola: value.nomeEscola,
				categoria: value.categoria,
				eixo: value.eixo,
				orientadores: orientadores,
				alunos: alunos,
				avaliacao: value.avaliacao,
				total: total,
				// Pra contagem de "Total premiados" (por categoria e geral), pro selo de
				// Premiado/Menção/Classificado e pra editar isso sem sair da tela.
				premiacao: value.premiacao,
				colocacao: value.colocacao,
				feirasClassificadas: value.feirasClassificadas
			};
		}

		// Categorias/eixos da Mostra, na ordem cadastrada (sem projetos ainda).
		function gruposDaMostra(edicao) {
			return ((edicao && edicao.categoriasEixos) || []).filter(function(c) { return c && c.categoria; }).map(function(c) {
				return {
					nome: c.categoria, foraDaMostra: false, geral: [], premiados: 0,
					eixos: (c.eixos || []).map(function(e) { return { nome: e, foraDaMostra: false, todos: [], ordenados: [], visiveis: [] }; })
				};
			});
		}

		// Põe o projeto no eixo da categoria dele, criando categoria/eixo "fora da lista da Mostra"
		// quando preciso (no fim, pra não embaralhar a ordem da Mostra).
		function encaixar(categorias, obj) {
			var nomeCat = obj.categoria || '(sem categoria)';
			var nomeEixo = obj.eixo || '(sem eixo)';
			var cat = categorias.filter(function(c) { return c.nome === nomeCat; })[0];
			if (!cat) {
				cat = { nome: nomeCat, foraDaMostra: true, geral: [], premiados: 0, eixos: [] };
				categorias.push(cat);
			}
			var eixo = cat.eixos.filter(function(e) { return e.nome === nomeEixo; })[0];
			if (!eixo) {
				eixo = { nome: nomeEixo, foraDaMostra: true, todos: [], ordenados: [], visiveis: [] };
				cat.eixos.push(eixo);
			}
			eixo.todos.push(obj);
		}

		let carregarProjetos = function() {
			var anoAtual = avaliacaoAPI.anoDaMostra();
			$rootScope.mencaoHonrosa = [];

			// Feiras: as externas (Mostratec etc.) do ano pra aba "Feiras" e a própria edição
			// (tipo:'edicao') pras categorias/eixos do ranking.
			avaliacaoAPI.getFeiras().then(function(response) {
				$rootScope.feirasComProjetos = response.data
					.filter(function(f) { return f.tipo !== 'edicao' && f.ano === anoAtual; })
					.map(function(f) { return {feira: f, projetos: []}; });
				var categorias = gruposDaMostra(avaliacaoAPI.edicaoDaMostra(response.data));

				avaliacaoAPI.getTodosProjetos()
				.then(function(response) {
					angular.forEach(response.data, function (value) {
						if (!avaliacaoAPI.pertenceAMostraAtual(value)) return;
						if (value.aprovado !== true) return;

						// Snapshot ANTES de construirObjExibicao, que pode zerar value.avaliacao
						// (caso [] vazio): entra no ranking por eixo quem foi avaliado ou teve a
						// participação confirmada.
						var elegivelRanking = value.avaliacao !== undefined || value.participa === true;
						let obj = construirObjExibicao(value);
						if (elegivelRanking) encaixar(categorias, obj);

						// Menção honrosa e classificação pra feiras externas são marcadas à
						// parte (Projetos > Premiação), independente do ranking por nota
						// acima - por isso checa sempre, pra qualquer projeto aprovado.
						if (value.premiacao === 'Mencao_honrosa') {
							$rootScope.mencaoHonrosa.push(obj);
						}
						if (value.feirasClassificadas && value.feirasClassificadas.length > 0) {
							$rootScope.feirasComProjetos.forEach(function(grupo) {
								if (value.feirasClassificadas.indexOf(grupo.feira._id) !== -1) {
									grupo.projetos.push(obj);
								}
							});
						}
					});
					$scope.categorias = categorias;
					// Aba que não existe mais (ex: outra Mostra) volta pra primeira.
					var abas = ['feiras', 'mencaoHonrosa'];
					categorias.forEach(function(c, i) { abas.push('cat' + i, 'geral' + i); });
					if (abas.indexOf($scope.abaAtiva) === -1) $scope.abaAtiva = 'cat0';
					$scope.reordenar();
				}, function(response) {
					console.log(response.data);
				});
			}, function(response) {
				console.log(response.data);
			});
		};
		$scope.carregarProjetos = carregarProjetos;

		$scope.visualizarDetalhes = function(projeto,ev) {
			$mdDialog.show({
				controller: function dialogController($scope, $rootScope, $mdDialog, $mdToast, avaliacaoAPI) {
					$scope.details = projeto;
					// Quantos avaliadores esta edição usa (ver models/feira-schema.js,
					// numAvaliadoresPorProjeto) - esta tela só lista o ano corrente.
					$scope.numAvaliadoresRange = [0, 1];
					avaliacaoAPI.getFeiras()
					.then(function(response) {
						var edicao = avaliacaoAPI.edicaoDaMostra(response.data);
						var n = (edicao && edicao.numAvaliadoresPorProjeto) || 2;
						var range = [];
						for (var i = 0; i < n; i++) range.push(i);
						$scope.numAvaliadoresRange = range;
					}, function(response) {
						console.log('Error: '+response.data);
					});
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

		// Editar Premiado/Menção honrosa/classificação pra feiras direto das abas "Geral -
		// ..." do Ranking - mesma tela/lógica de Projetos > Premiação
		// (projetosCtrl.js#visualizarDetalhesPremiacao + details.premiacao.html), só
		// reaproveitando avaliacaoAPI em vez de adminAPI (módulos Angular diferentes) e
		// recarregando com carregarProjetos() no lugar de $rootScope.recarregar.
		$scope.abrirDetalhesPremiacao = function(projeto, ev) {
			$mdDialog.show({
				controller: function dialogController($scope, $mdDialog, $mdToast, avaliacaoAPI) {
					$scope.details = projeto;
					$scope.premiacao = { _id: projeto._id };
					$scope.feirasDisponiveis = [];
					$scope.premiacao.feirasSelecionadas = {};
					avaliacaoAPI.getFeiras().then(function(response) {
						angular.forEach(response.data, function(feira) {
							if (feira.tipo !== 'edicao' && feira.ano === avaliacaoAPI.anoDaMostra() && feira.categorias.indexOf(projeto.categoria) !== -1) {
								$scope.feirasDisponiveis.push(feira);
								if (projeto.feirasClassificadas && projeto.feirasClassificadas.indexOf(feira._id) !== -1) {
									$scope.premiacao.feirasSelecionadas[feira._id] = true;
								}
							}
						});
					}, function(response) {
						console.log('Error: ' + response.data);
					});

					$scope.setPremiado = function() {
						$scope.premiacao.feirasClassificadas = Object.keys($scope.premiacao.feirasSelecionadas).filter(function(id) {
							return $scope.premiacao.feirasSelecionadas[id];
						});
						avaliacaoAPI.putPremiadoProjetos($scope.premiacao).then(function() {
							$scope.toast('Projeto premiado com sucesso!', 'success-toast');
							$mdDialog.hide();
							setTimeout(carregarProjetos, 750);
						}, function(response) {
							$scope.toast('Falha ao salvar. ' + response.data, 'failed-toast');
						});
					};
					$scope.toast = function(message, tema) {
						var toast = $mdToast.simple().textContent(message).action('✖').position('top right').theme(tema).hideDelay(4000);
						$mdToast.show(toast);
					};
					$scope.hide = function() { $mdDialog.hide(); };
					$scope.cancel = function() { $mdDialog.cancel(); };
				},
				templateUrl: 'admin/avaliacao/views/details-premiacao-ranking.html',
				parent: angular.element(document.body),
				targetEvent: ev,
				clickOutsideToClose: false
			});
		};

		$scope.query = 'nomeProjeto';
		$scope.setBusca = function(campo) {
			$scope.query = campo;
		};

		carregarProjetos();

		// Quantos projetos por eixo contam como "Premiado" ao confirmar - gravado por ano
		// (ver GET /admin/configPremiacao), começa em 3 até o usuário mudar e confirmar.
		$scope.numPremiadosPorEixo = 3;
		avaliacaoAPI.getConfigPremiacao(avaliacaoAPI.anoDaMostra())
			.then(function(response) { $scope.numPremiadosPorEixo = response.data.numPremiadosPorEixo; }, function(response) { console.log(response.data); });

		var ehPremiado = function(p) { return p && p._id && p.premiacao === 'Premiado'; };

		// Ordena cada eixo por nota, marca empates, monta o que a aba mostra no modo escolhido e
		// recalcula as listas gerais e os contadores de premiados.
		$scope.reordenar = function() {
			var total = 0;
			$scope.categorias.forEach(function(cat) {
				cat.geral = [];
				cat.eixos.forEach(function(eixo) {
					eixo.ordenados = $filter('orderBy')(eixo.todos, '-total', false);
					marcarEmpates(eixo.ordenados);
					// Alfabético: só os 3 primeiros de cada eixo, em ordem de nome (não revela a colocação).
					eixo.visiveis = $scope.rank === 'nomeProjeto'
						? $filter('orderBy')(eixo.ordenados.slice(0, 3), 'nomeProjeto', false)
						: eixo.ordenados;
					cat.geral = cat.geral.concat(eixo.todos);
				});
				cat.premiados = cat.geral.filter(ehPremiado).length;
				cat.temProjetos = cat.geral.length > 0;
				total += cat.premiados;
			});
			$scope.totalPremiadosGeral = total;
		};

		// Seletor "Ranqueamento" da toolbar.
		$scope.recarregar = function(filtro) {
			$scope.rank = filtro;
			$scope.reordenar();
		};

		// Primeiros N de cada eixo por nota (base dos PDFs e da confirmação de premiados).
		function topN(eixo, n) {
			return eixo.ordenados.filter(function(p) { return p && p._id; }).slice(0, n);
		}
		// Percorre todos os eixos (na ordem das abas) com o nome da seção "Categoria - Eixo".
		function cadaEixo(fn) {
			$scope.categorias.forEach(function(cat) {
				cat.eixos.forEach(function(eixo) { fn(eixo, cat.nome + ' - ' + eixo.nome); });
			});
		}

		// Seções de classificação pra feiras externas e menção honrosa - cross-cutting
		// (não são por eixo/categoria como o resto do PDF, um projeto de qualquer eixo pode
		// ter sido marcado assim em Projetos > Premiação), por isso mostram Categoria/Eixo
		// como colunas em vez de vir implícito no título da seção. Sem coluna de
		// colocação/pontuação nas duas - não é esse o critério aqui, e entram do mesmo jeito
		// nas duas versões do PDF (baixarPdfColocacao/baixarPdfDestaques).
		function secoesFeirasEMencaoHonrosa() {
			var colunas = [
				{ texto: 'Nº Inscrição', largura: 55 },
				{ texto: 'Projeto', largura: '*' },
				{ texto: 'Categoria', largura: 90 },
				{ texto: 'Eixo', largura: 100 },
				{ texto: 'Escola', largura: 100 },
				{ texto: 'Aluno(s)', largura: 110 },
				{ texto: 'Orientador(es)', largura: 110 }
			];
			function linhasDe(lista) {
				return lista.map(function(p) {
					return [p.numInscricao, p.nomeProjeto, p.categoria, p.eixo, p.nomeEscola, p.alunos, p.orientadores];
				});
			}
			var secoes = [];
			$rootScope.feirasComProjetos.forEach(function(grupo) {
				if (grupo.projetos.length === 0) return;
				secoes.push({ titulo: 'Classificados - ' + grupo.feira.nome, colunas: colunas, linhas: linhasDe(grupo.projetos) });
			});
			if ($rootScope.mencaoHonrosa.length > 0) {
				secoes.push({ titulo: 'Menção Honrosa', colunas: colunas, linhas: linhasDe($rootScope.mencaoHonrosa) });
			}
			return secoes;
		}

		// PDF com a colocação de verdade (1º, 2º, 3º + pontuação) - uma seção por eixo que
		// tem pelo menos um projeto avaliado, na mesma ordem das abas da tela.
		$scope.baixarPdfColocacao = function() {
			var secoes = [];
			cadaEixo(function(eixo, titulo) {
				var top = topN(eixo, 3);
				if (top.length === 0) return;
				secoes.push({
					titulo: titulo,
					colunas: [
						{ texto: 'Colocação', largura: 60 },
						{ texto: 'Pontuação', largura: 60 },
						{ texto: 'Nº Inscrição', largura: 60 },
						{ texto: 'Projeto', largura: '*' },
						{ texto: 'Escola', largura: 110 },
						{ texto: 'Aluno(s)', largura: 120 },
						{ texto: 'Orientador(es)', largura: 120 }
					],
					linhas: top.map(function(p, i) {
						return [(i + 1) + 'º', p.total, p.numInscricao, p.nomeProjeto, p.nomeEscola, p.alunos, p.orientadores];
					})
				});
			});
			secoes = secoes.concat(secoesFeirasEMencaoHonrosa());
			relatorioPdfService.tabelas({
				titulo: 'Ranking - 1º, 2º e 3º colocados',
				subtitulo: 'MOVACI ' + avaliacaoAPI.anoDaMostra(),
				orientacao: 'landscape',
				secoes: secoes,
				arquivo: avaliacaoAPI.anoDaMostra() + '_Ranking_Colocacao'
			});
		};

		// PDF só com os 3 destaques de cada eixo, sem revelar quem ficou em 1º/2º/3º: nem
		// coluna de colocação, nem de pontuação, e a ordem de exibição é alfabética (não por
		// nota) - senão a posição na lista já entregaria o resultado.
		$scope.baixarPdfDestaques = function() {
			var secoes = [];
			cadaEixo(function(eixo, titulo) {
				var destaques = topN(eixo, 3).sort(function(a, b) {
					return (a.nomeProjeto || '').localeCompare(b.nomeProjeto || '');
				});
				if (destaques.length === 0) return;
				secoes.push({
					titulo: titulo,
					colunas: [
						{ texto: 'Nº Inscrição', largura: 60 },
						{ texto: 'Projeto', largura: '*' },
						{ texto: 'Escola', largura: 110 },
						{ texto: 'Aluno(s)', largura: 120 },
						{ texto: 'Orientador(es)', largura: 120 }
					],
					linhas: destaques.map(function(p) {
						return [p.numInscricao, p.nomeProjeto, p.nomeEscola, p.alunos, p.orientadores];
					})
				});
			});
			secoes = secoes.concat(secoesFeirasEMencaoHonrosa());
			relatorioPdfService.tabelas({
				titulo: 'Ranking - Destaques',
				subtitulo: 'MOVACI ' + avaliacaoAPI.anoDaMostra(),
				orientacao: 'landscape',
				secoes: secoes,
				arquivo: avaliacaoAPI.anoDaMostra() + '_Ranking_Destaques'
			});
		};

		// Confirma os destaques (top N por eixo, N = numPremiadosPorEixo) como Premiado de
		// verdade: grava premiacao:'Premiado' + colocacao em cada projeto no banco (mesmos
		// campos usados em Projetos > Premiação) e desmarca quem tinha sido premiado antes
		// nesse ano mas caiu do top N numa nova rodada de confirmação. NÃO mexe em
		// feirasClassificadas/menção honrosa - esses continuam só manuais (Projetos >
		// Premiação), não fazem parte desse fluxo automático.
		$scope.confirmarPremiados = function(ev) {
			var premiados = [];
			cadaEixo(function(eixo) {
				topN(eixo, $scope.numPremiadosPorEixo).forEach(function(p, i) {
					premiados.push({ id: p._id, colocacao: i + 1 });
				});
			});

			if (premiados.length === 0) {
				$mdDialog.show($mdDialog.alert()
					.title('Nada pra confirmar')
					.textContent('Nenhum projeto avaliado até o momento nos eixos desta tela.')
					.ok('Entendi')
					.targetEvent(ev));
				return;
			}

			var confirm = $mdDialog.confirm()
				.title('Confirmar premiados?')
				.textContent('Isso vai marcar ' + premiados.length + ' projeto(s) (top ' + $scope.numPremiadosPorEixo + ' de cada eixo) como Premiado, com a colocação de cada um. Quem estava premiado antes nesse ano e não está mais entre os primeiros ' + $scope.numPremiadosPorEixo + ' do seu eixo será desmarcado. Feiras/menção honrosa continuam manuais. Essa ação não pode ser desfeita.')
				.targetEvent(ev)
				.ok('Confirmar')
				.cancel('Cancelar');
			$mdDialog.show(confirm).then(function() {
				avaliacaoAPI.postConfirmarPremiados({
					ano: avaliacaoAPI.anoDaMostra(),
					numPremiadosPorEixo: $scope.numPremiadosPorEixo,
					premiados: premiados
				})
				.then(function(response) {
					$mdDialog.show($mdDialog.alert()
						.title('Premiados confirmados')
						.textContent(response.data.marcados + ' projeto(s) marcado(s) como Premiado.')
						.ok('Entendi')
						.targetEvent(ev));
					// Recarrega do servidor pra os totais de premiados refletirem o resultado de
					// imediato, sem precisar dar F5.
					carregarProjetos();
				}, function(response) {
					$mdDialog.show($mdDialog.alert()
						.title('Falha ao confirmar')
						.textContent('Não foi possível confirmar os premiados. ' + response.data)
						.ok('Entendi')
						.targetEvent(ev));
				});
			}, function() {});
		};
	});
})();
