(function(){
	'use strict';

	// Grupos categoria/eixo na mesma ordem das abas e seções da tela (ver ranking.html e
	// list-ranking1/2/3.html) - usado pra montar os PDFs de resultado (baixarPdfColocacao/
	// baixarPdfDestaques abaixo) e pra saber quais chaves de $rootScope marcar empate
	// (marcarEmpates), lendo os arrays já carregados/ordenados em $rootScope.
	var GRUPOS_EIXOS = [
		{categoria: 'Fundamental I', eixos: [
			{nome: 'Ciências da Natureza e suas tecnologias', chave: 'eixo1_1'},
			{nome: 'Ciências Humanas e suas tecnologias', chave: 'eixo1_2'},
			{nome: 'Linguagens, Códigos e suas tecnologias', chave: 'eixo1_3'},
			{nome: 'Matemática e suas tecnologias', chave: 'eixo1_4'}
		]},
		{categoria: 'Fundamental II', eixos: [
			{nome: 'Ciências da Natureza e suas tecnologias', chave: 'eixo2_1'},
			{nome: 'Ciências Humanas e suas tecnologias', chave: 'eixo2_2'},
			{nome: 'Linguagens, Códigos e suas tecnologias', chave: 'eixo2_3'},
			{nome: 'Matemática e suas tecnologias', chave: 'eixo2_4'}
		]},
		{categoria: 'Ensino Médio, Técnico e Superior', eixos: [
			{nome: 'Ciências Agrárias, Exatas e da Terra', chave: 'eixo1'},
			{nome: 'Ciências Ambientais, Biológicas e da Saúde', chave: 'eixo2'},
			{nome: 'Ciências Humanas e Sociais Aplicadas', chave: 'eixo3'},
			{nome: 'Línguas e Artes', chave: 'eixo4'},
			{nome: 'Extensão', chave: 'eixo5'},
			{nome: 'Ciências da Computação', chave: 'eixo6'},
			{nome: 'Engenharias', chave: 'eixo7'}
		]}
	];

	var TODAS_CHAVES_EIXO = GRUPOS_EIXOS.reduce(function(acc, grupo) {
		return acc.concat(grupo.eixos.map(function(e) { return e.chave; }));
	}, []);

	// Marca (proj.empatado = true) quem está empatado numa pontuação que afeta o pódio -
	// tanto empates dentro do 1º-3º quanto um 4º colocado (ou mais abaixo) empatado com o
	// 3º, que também precisa aparecer pra ajudar no desempate. Empate abaixo dessa faixa
	// (ex: 5º empatado com 6º) não importa pro resultado e não é destacado. `lista` já
	// vem ordenada por -total (ver reordenar() abaixo).
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
		// cabeçalho fixo/sticky). "fund1" replica o mesmo primeiro-aba-ativa-por-padrão que
		// <md-tabs> já tinha.
		$scope.abaAtiva = 'fund1';

		$rootScope.projetos = [];
		$rootScope.eixo1_1 = [];
		$rootScope.eixo1_2 = [];
		$rootScope.eixo1_3 = [];
		$rootScope.eixo1_4 = [];
		$rootScope.eixo2_1 = [];
		$rootScope.eixo2_2 = [];
		$rootScope.eixo2_3 = [];
		$rootScope.eixo2_4 = [];
		$rootScope.eixo1 = [];
		$rootScope.eixo2 = [];
		$rootScope.eixo3 = [];
		$rootScope.eixo4 = [];
		$rootScope.eixo5 = [];
		$rootScope.eixo6 = [];
		$rootScope.eixo7 = [];

		$rootScope.ori_eixo1_1 = [];
		$rootScope.ori_eixo1_2 = [];
		$rootScope.ori_eixo1_3 = [];
		$rootScope.ori_eixo1_4 = [];
		$rootScope.ori_eixo2_1 = [];
		$rootScope.ori_eixo2_2 = [];
		$rootScope.ori_eixo2_3 = [];
		$rootScope.ori_eixo2_4 = [];
		$rootScope.ori_eixo1 = [];
		$rootScope.ori_eixo2 = [];
		$rootScope.ori_eixo3 = [];
		$rootScope.ori_eixo4 = [];
		$rootScope.ori_eixo5 = [];
		$rootScope.ori_eixo6 = [];
		$rootScope.ori_eixo7 = [];

		$rootScope.trouxas = [];
		$rootScope.mencaoHonrosa = [];
		$rootScope.feirasComProjetos = [];
		$scope.searchProject = "";

		// Constrói o objeto de exibição comum (total da nota + orientadores/alunos já
		// concatenados) uma vez só por projeto - antes essa mesma conta era copiada e colada
		// em 4 lugares (uma por categoria + "trouxas"), o que deixava fácil de esquecer um
		// lugar ao adicionar um novo uso (caso de menção honrosa/feiras abaixo).
		function construirObjExibicao(value) {
			var total;
			if (value.avaliacao !== undefined && value.avaliacao.length > 0) {
				total = (value.avaliacao[2] !== undefined)
					? value.avaliacao[0]+value.avaliacao[1]+value.avaliacao[2]
					: value.avaliacao[0]+value.avaliacao[1];
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
				// Premiado/Menção/Classificado (independente do modo de ordenação - ver
				// abrirDetalhesPremiacao abaixo) e pra editar isso sem sair da tela.
				premiacao: value.premiacao,
				colocacao: value.colocacao,
				feirasClassificadas: value.feirasClassificadas
			};
		}

		let carregarProjetos = function() {
			var anoAtual = new Date(Date.now()).getFullYear();

			// Zera os acumuladores antes de recarregar - carregarProjetos() agora é chamado
			// de novo depois de confirmarPremiados() (pra atualizar os totais na tela), e sem
			// isso cada chamada extra ia EMPILHAR projetos duplicados em cima dos que já
			// estavam nesses arrays (só eram zerados uma vez, na inicialização do controller).
			TODAS_CHAVES_EIXO.forEach(function(chave) { $rootScope[chave] = []; });
			$rootScope.projetos = [];
			$rootScope.trouxas = [];
			$rootScope.mencaoHonrosa = [];

			// Feiras externas (Mostratec etc.) cadastradas pro ano atual - carrega antes dos
			// projetos pra já poder agrupar por feira na mesma passada (ver
			// value.feirasClassificadas abaixo). tipo:'edicao' é a própria edição do
			// MOVACI/PDIAP reaproveitando essa coleção (ver models/feira-schema.js), não uma
			// feira de classificação de verdade - fica de fora.
			avaliacaoAPI.getFeiras().success(function(feiras) {
				$rootScope.feirasComProjetos = feiras
					.filter(function(f) { return f.tipo !== 'edicao' && f.ano === anoAtual; })
					.map(function(f) { return {feira: f, projetos: []}; });

				avaliacaoAPI.getTodosProjetos()
				.success(function(projetos) {
					angular.forEach(projetos, function (value, key) {
						var ano = new Date(value.createdAt).getFullYear();
						if (ano !== anoAtual) return;
						if (value.aprovado !== true) return;

						// Snapshot ANTES de construirObjExibicao, que pode zerar
						// value.avaliacao (caso [] vazio) - preserva o mesmo critério de
						// sempre pra decidir se entra no ranking por eixo (avaliado ou
						// participação confirmada) ou só em "trouxas".
						var elegivelRanking = value.avaliacao !== undefined || value.participa === true;
						let obj = construirObjExibicao(value);

						if (elegivelRanking) {
							if (value.categoria === 'Fundamental I (1º ao 5º anos)') {
								switch(value.eixo) {
									case 'Ciências da Natureza e suas tecnologias': $rootScope.eixo1_1.push(obj); break;
									case 'Ciências Humanas e suas tecnologias': $rootScope.eixo1_2.push(obj); break;
									case 'Linguagens, Códigos e suas tecnologias': $rootScope.eixo1_3.push(obj); break;
									case 'Matemática e suas tecnologias': $rootScope.eixo1_4.push(obj); break;
									default:
									// default code block
								}
							} else if (value.categoria === 'Fundamental II (6º ao 9º anos)') {
								switch(value.eixo) {
									case 'Ciências da Natureza e suas tecnologias': $rootScope.eixo2_1.push(obj); break;
									case 'Ciências Humanas e suas tecnologias': $rootScope.eixo2_2.push(obj); break;
									case 'Linguagens, Códigos e suas tecnologias': $rootScope.eixo2_3.push(obj); break;
									case 'Matemática e suas tecnologias': $rootScope.eixo2_4.push(obj); break;
									default:
									// default code block
								}
							} else if (value.categoria === 'Ensino Médio, Técnico e Superior') {
								$rootScope.projetos.push(obj);
								switch(value.eixo) {
									case 'Ciências Agrárias, Exatas e da Terra': $rootScope.eixo1.push(obj); break;
									case 'Ciências Ambientais, Biológicas e da Saúde': $rootScope.eixo2.push(obj); break;
									case 'Ciências Humanas e Sociais Aplicadas': $rootScope.eixo3.push(obj); break;
									case 'Línguas e Artes': $rootScope.eixo4.push(obj); break;
									case 'Extensão': $rootScope.eixo5.push(obj); break;
									case 'Ciências da Computação': $rootScope.eixo6.push(obj); break;
									case 'Engenharias': $rootScope.eixo7.push(obj); break;
									default:
									// default code block
								}
							}
						} else {
							$rootScope.trouxas.push(obj);
						}

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
					$scope.reordenar();
				})
				.error(function(status) {
					console.log(status);
				});
			})
			.error(function(status) {
				console.log(status);
			});
		};
		$scope.carregarProjetos = carregarProjetos;

		$scope.visualizarDetalhes = function(projeto,ev) {
			$mdDialog.show({
				controller: function dialogController($scope, $rootScope, $mdDialog, $mdToast, avaliacaoAPI) {
					$scope.details = projeto;
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
					avaliacaoAPI.getFeiras().success(function(feiras) {
						angular.forEach(feiras, function(feira) {
							if (feira.tipo !== 'edicao' && feira.ano === new Date(Date.now()).getFullYear() && feira.categorias.indexOf(projeto.categoria) !== -1) {
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
						avaliacaoAPI.putPremiadoProjetos($scope.premiacao).success(function() {
							$scope.toast('Projeto premiado com sucesso!', 'success-toast');
							$mdDialog.hide();
							setTimeout(carregarProjetos, 750);
						}).error(function(status) {
							$scope.toast('Falha ao salvar. ' + status, 'failed-toast');
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

		// $rootScope.ordenacao = ['categoria','eixo'];
		// $rootScope.ordenarPor = function(campo) {
		// 	$rootScope.ordenacao = campo;
		// }

		$scope.query = 'nomeProjeto';
		$scope.setBusca = function(campo) {
			$scope.query = campo;
		}

		carregarProjetos();

		// Quantos projetos por eixo contam como "Premiado" ao confirmar - gravado por ano
		// (ver GET /admin/configPremiacao), começa em 3 até o usuário mudar e confirmar.
		$scope.numPremiadosPorEixo = 3;
		avaliacaoAPI.getConfigPremiacao(new Date(Date.now()).getFullYear())
			.success(function(data) { $scope.numPremiadosPorEixo = data.numPremiadosPorEixo; })
			.error(function(status) { console.log(status); });

		$scope.reordenar = function(){
			$rootScope.ori_eixo1_1 = $filter('orderBy')($rootScope.eixo1_1,'-total',false);
			$rootScope.ori_eixo1_2 = $filter('orderBy')($rootScope.eixo1_2,'-total',false);
			$rootScope.ori_eixo1_3 = $filter('orderBy')($rootScope.eixo1_3,'-total',false);
			$rootScope.ori_eixo1_4 = $filter('orderBy')($rootScope.eixo1_4,'-total',false);

			$rootScope.ori_eixo2_1 = $filter('orderBy')($rootScope.eixo2_1,'-total',false);
			$rootScope.ori_eixo2_2 = $filter('orderBy')($rootScope.eixo2_2,'-total',false);
			$rootScope.ori_eixo2_3 = $filter('orderBy')($rootScope.eixo2_3,'-total',false);
			$rootScope.ori_eixo2_4 = $filter('orderBy')($rootScope.eixo2_4,'-total',false);

			$rootScope.ori_eixo1 = $filter('orderBy')($rootScope.eixo1,'-total',false);
			$rootScope.ori_eixo2 = $filter('orderBy')($rootScope.eixo2,'-total',false);
			$rootScope.ori_eixo3 = $filter('orderBy')($rootScope.eixo3,'-total',false);
			$rootScope.ori_eixo4 = $filter('orderBy')($rootScope.eixo4,'-total',false);
			$rootScope.ori_eixo5 = $filter('orderBy')($rootScope.eixo5,'-total',false);
			$rootScope.ori_eixo6 = $filter('orderBy')($rootScope.eixo6,'-total',false);
			$rootScope.ori_eixo7 = $filter('orderBy')($rootScope.eixo7,'-total',false);

			$rootScope.eixo1_1 = $rootScope.ori_eixo1_1; 
			$rootScope.eixo1_2 = $rootScope.ori_eixo1_2;
			$rootScope.eixo1_3 = $rootScope.ori_eixo1_3;
			$rootScope.eixo1_4 = $rootScope.ori_eixo1_4;
			$rootScope.eixo2_1 = $rootScope.ori_eixo2_1;
			$rootScope.eixo2_2 = $rootScope.ori_eixo2_2;
			$rootScope.eixo2_3 = $rootScope.ori_eixo2_3;
			$rootScope.eixo2_4 = $rootScope.ori_eixo2_4;
			$rootScope.eixo1 = $rootScope.ori_eixo1;
			$rootScope.eixo2 = $rootScope.ori_eixo2;
			$rootScope.eixo3 = $rootScope.ori_eixo3;
			$rootScope.eixo4 = $rootScope.ori_eixo4;
			$rootScope.eixo5 = $rootScope.ori_eixo5;
			$rootScope.eixo6 = $rootScope.ori_eixo6;
			$rootScope.eixo7 = $rootScope.ori_eixo7;

			TODAS_CHAVES_EIXO.forEach(function(chave) { marcarEmpates($rootScope[chave]); });
			atualizarContadoresPremiados();
			atualizarGerais();
		}

		var CHAVES_FUND1 = ['eixo1_1', 'eixo1_2', 'eixo1_3', 'eixo1_4'];
		var CHAVES_FUND2 = ['eixo2_1', 'eixo2_2', 'eixo2_3', 'eixo2_4'];
		var CHAVES_ENSINO_MEDIO = ['eixo1', 'eixo2', 'eixo3', 'eixo4', 'eixo5', 'eixo6', 'eixo7'];

		// Total de projetos já confirmados como Premiado (premiacao:'Premiado' - ver
		// confirmarPremiados abaixo) por categoria e no geral, pro painel no topo da tela.
		function contarPremiados(chaves) {
			var total = 0;
			chaves.forEach(function(chave) {
				total += ($rootScope[chave] || []).filter(function(p) { return p && p._id && p.premiacao === 'Premiado'; }).length;
			});
			return total;
		}
		function atualizarContadoresPremiados() {
			$scope.totalPremiadosFund1 = contarPremiados(CHAVES_FUND1);
			$scope.totalPremiadosFund2 = contarPremiados(CHAVES_FUND2);
			$scope.totalPremiadosEnsinoMedio = contarPremiados(CHAVES_ENSINO_MEDIO);
			$scope.totalPremiadosGeral = $scope.totalPremiadosFund1 + $scope.totalPremiadosFund2 + $scope.totalPremiadosEnsinoMedio;
		}

		// Listagem geral de cada categoria - todos os eixos juntos numa lista só, pontuados
		// por nota (usada nas abas "Geral - ..." pra decidir quem classificar pra feiras
		// externas tipo Mostratec, já que essa decisão é por categoria inteira, não por
		// eixo). A ordenação em si (Alfabético/Pontuação) fica no template via orderBy,
		// lendo $scope.rank (mesmo seletor "Ranqueamento" já usado nas abas por eixo).
		function juntarEixos(chaves) {
			var lista = [];
			chaves.forEach(function(chave) { lista = lista.concat($rootScope[chave] || []); });
			return lista.filter(function(p) { return p && p._id; });
		}
		function atualizarGerais() {
			$scope.geralFund1 = juntarEixos(CHAVES_FUND1);
			$scope.geralFund2 = juntarEixos(CHAVES_FUND2);
			$scope.geralEnsinoMedio = juntarEixos(CHAVES_ENSINO_MEDIO);
		}

		$scope.recarregar = function(filtro){
			if(filtro === 'nomeProjeto'){
				var eixo1_1 = [];
				var eixo1_2 = [];
				var eixo1_3 = [];
				var eixo1_4 = [];

				var eixo2_1 = [];
				var eixo2_2 = [];
				var eixo2_3 = [];
				var eixo2_4 = [];

				var eixo1 = [];
				var eixo2 = [];
				var eixo3 = [];
				var eixo4 = [];
				var eixo5 = [];
				var eixo6 = [];
				var eixo7 = [];
				for(var x=0; x<3;x++){
					eixo1_1.push($rootScope.eixo1_1[x]);					
					eixo1_2.push($rootScope.eixo1_2[x]);
					eixo1_3.push($rootScope.eixo1_3[x]);
					eixo1_4.push($rootScope.eixo1_4[x]);
					eixo2_1.push($rootScope.eixo2_1[x]);					
					eixo2_2.push($rootScope.eixo2_2[x]);
					eixo2_3.push($rootScope.eixo2_3[x]);
					eixo2_4.push($rootScope.eixo2_4[x]);
		
					eixo1.push($rootScope.eixo1[x]);
					eixo2.push($rootScope.eixo2[x]);
					eixo3.push($rootScope.eixo3[x]);
					eixo4.push($rootScope.eixo4[x]);
					eixo5.push($rootScope.eixo5[x]);
					eixo6.push($rootScope.eixo6[x]);
					eixo7.push($rootScope.eixo7[x]);
				}			
						
				if(eixo1_1[2] == null) eixo1_1[2] = {_id:null,total:0};
				if(eixo1_2[2] == null) eixo1_2[2] = {_id:null,total:0};
				if(eixo1_3[2] == null) eixo1_3[2] = {_id:null,total:0};
				if(eixo1_4[2] == null) eixo1_4[2] = {_id:null,total:0};

				if(eixo2_1[2] == null) eixo1_1[2] = {_id:null,total:0};
				if(eixo2_2[2] == null) eixo1_2[2] = {_id:null,total:0};
				if(eixo2_3[2] == null) eixo1_3[2] = {_id:null,total:0};
				if(eixo2_4[2] == null) eixo1_4[2] = {_id:null,total:0};

				if(eixo1[2] == null) eixo1[2] = {_id:null,total:0};
				if(eixo2[2] == null) eixo2[2] = {_id:null,total:0};
				if(eixo3[2] == null) eixo3[2] = {_id:null,total:0};
				if(eixo4[2] == null) eixo4[2] = {_id:null,total:0};
				if(eixo5[2] == null) eixo5[2] = {_id:null,total:0};
				if(eixo6[2] == null) eixo6[2] = {_id:null,total:0};
				if(eixo7[2] == null) eixo7[2] = {_id:null,total:0};			

				if(eixo1_1[1] == null) eixo1_1[1] = {_id:null,total:0};
				if(eixo1_2[1] == null) eixo1_2[1] = {_id:null,total:0};
				if(eixo1_3[1] == null) eixo1_3[1] = {_id:null,total:0};
				if(eixo1_4[1] == null) eixo1_4[1] = {_id:null,total:0};

				if(eixo2_1[1] == null) eixo1_1[1] = {_id:null,total:0};
				if(eixo2_2[1] == null) eixo1_2[1] = {_id:null,total:0};
				if(eixo2_3[1] == null) eixo1_3[1] = {_id:null,total:0};
				if(eixo2_4[1] == null) eixo1_4[1] = {_id:null,total:0};

				if(eixo1[1] == null) eixo1[1] = {_id:null,total:0};
				if(eixo2[1] == null) eixo2[1] = {_id:null,total:0};
				if(eixo3[1] == null) eixo3[1] = {_id:null,total:0};
				if(eixo4[1] == null) eixo4[1] = {_id:null,total:0};
				if(eixo5[1] == null) eixo5[1] = {_id:null,total:0};
				if(eixo6[1] == null) eixo6[1] = {_id:null,total:0};
				if(eixo7[1] == null) eixo7[1] = {_id:null,total:0};

				if(eixo1_1[0] == null) eixo1_1 = [];
				if(eixo1_2[0] == null) eixo1_2 = [];
				if(eixo1_3[0] == null) eixo1_3 = [];
				if(eixo1_4[0] == null) eixo1_4 = [];

				if(eixo2_1[0] == null) eixo1_1 = [];
				if(eixo2_2[0] == null) eixo1_2 = [];
				if(eixo2_3[0] == null) eixo1_3 = [];
				if(eixo2_4[0] == null) eixo1_4 = [];

				if(eixo1[0] == null) eixo1 = [];
				if(eixo2[0] == null) eixo2 = [];
				if(eixo3[0] == null) eixo3 = [];
				if(eixo4[0] == null) eixo4 = [];
				if(eixo5[0] == null) eixo5 = [];
				if(eixo6[0] == null) eixo6 = [];
				if(eixo7[0] == null) eixo7 = [];
				
				$rootScope.eixo1_1 = $filter('orderBy')(eixo1_1,filtro,false);
				$rootScope.eixo1_2 = $filter('orderBy')(eixo1_2,filtro,false);
				$rootScope.eixo1_3 = $filter('orderBy')(eixo1_3,filtro,false);
				$rootScope.eixo1_4 = $filter('orderBy')(eixo1_4,filtro,false);

				$rootScope.eixo2_1 = $filter('orderBy')(eixo2_1,filtro,false);
				$rootScope.eixo2_2 = $filter('orderBy')(eixo2_2,filtro,false);
				$rootScope.eixo2_3 = $filter('orderBy')(eixo2_3,filtro,false);
				$rootScope.eixo2_4 = $filter('orderBy')(eixo2_4,filtro,false);

				$rootScope.eixo1 = $filter('orderBy')(eixo1,filtro,false);
				$rootScope.eixo2 = $filter('orderBy')(eixo2,filtro,false);
				console.log("EIXO2:"+JSON.stringify($rootScope.eixo2));
				$rootScope.eixo3 = $filter('orderBy')(eixo3,filtro,false);
				$rootScope.eixo4 = $filter('orderBy')(eixo4,filtro,false);
				$rootScope.eixo5 = $filter('orderBy')(eixo5,filtro,false);
				$rootScope.eixo6 = $filter('orderBy')(eixo6,filtro,false);
				$rootScope.eixo7 = $filter('orderBy')(eixo7,filtro,false);
			} else {
				$rootScope.eixo1_1 = $filter('orderBy')($rootScope.ori_eixo1_1,filtro,false);
				$rootScope.eixo1_2 = $filter('orderBy')($rootScope.ori_eixo1_2,filtro,false);
				$rootScope.eixo1_3 = $filter('orderBy')($rootScope.ori_eixo1_3,filtro,false);
				$rootScope.eixo1_4 = $filter('orderBy')($rootScope.ori_eixo1_4,filtro,false);

				$rootScope.eixo2_1 = $filter('orderBy')($rootScope.ori_eixo2_1,filtro,false);
				$rootScope.eixo2_2 = $filter('orderBy')($rootScope.ori_eixo2_2,filtro,false);
				$rootScope.eixo2_3 = $filter('orderBy')($rootScope.ori_eixo2_3,filtro,false);
				$rootScope.eixo2_4 = $filter('orderBy')($rootScope.ori_eixo2_4,filtro,false);

				$rootScope.eixo1 = $filter('orderBy')($rootScope.ori_eixo1,filtro,false);
				$rootScope.eixo2 = $filter('orderBy')($rootScope.ori_eixo2,filtro,false);
				$rootScope.eixo3 = $filter('orderBy')($rootScope.ori_eixo3,filtro,false);
				$rootScope.eixo4 = $filter('orderBy')($rootScope.ori_eixo4,filtro,false);
				$rootScope.eixo5 = $filter('orderBy')($rootScope.ori_eixo5,filtro,false);
				$rootScope.eixo6 = $filter('orderBy')($rootScope.ori_eixo6,filtro,false);
				$rootScope.eixo7 = $filter('orderBy')($rootScope.ori_eixo7,filtro,false);
			}


		}

		// Top 3 de um eixo (array já carregado/ordenado por -total em $rootScope, ver
		// reordenar() acima) - filtra os placeholders {_id:null} que recarregar() pode ter
		// deixado pra trás se o usuário trocou pra ordenação alfabética antes de baixar o PDF.
		function top3(chave) {
			return topN(chave, 3);
		}

		// Igual a top3, mas com a quantidade configurável - usado por confirmarPremiados
		// abaixo (top3 continua fixo em 3 de propósito, só pros PDFs de resultado - mudar
		// numPremiadosPorEixo não afeta o "1º, 2º e 3º colocados" do PDF, só quem confirmar
		// marca como Premiado).
		function topN(chave, n) {
			return ($rootScope[chave] || []).filter(function(p) { return p && p._id; }).slice(0, n);
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
			GRUPOS_EIXOS.forEach(function(grupo) {
				grupo.eixos.forEach(function(eixo) {
					var top = top3(eixo.chave);
					if (top.length === 0) return;
					secoes.push({
						titulo: grupo.categoria + ' - ' + eixo.nome,
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
			});
			secoes = secoes.concat(secoesFeirasEMencaoHonrosa());
			relatorioPdfService.tabelas({
				titulo: 'Ranking - 1º, 2º e 3º colocados',
				subtitulo: 'MOVACI ' + new Date().getFullYear(),
				orientacao: 'landscape',
				secoes: secoes,
				arquivo: new Date().getFullYear() + '_Ranking_Colocacao'
			});
		};

		// PDF só com os 3 destaques de cada eixo, sem revelar quem ficou em 1º/2º/3º: nem
		// coluna de colocação, nem de pontuação, e a ordem de exibição é alfabética (não por
		// nota) - senão a posição na lista já entregaria o resultado.
		$scope.baixarPdfDestaques = function() {
			var secoes = [];
			GRUPOS_EIXOS.forEach(function(grupo) {
				grupo.eixos.forEach(function(eixo) {
					var destaques = top3(eixo.chave).sort(function(a, b) {
						return (a.nomeProjeto || '').localeCompare(b.nomeProjeto || '');
					});
					if (destaques.length === 0) return;
					secoes.push({
						titulo: grupo.categoria + ' - ' + eixo.nome,
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
			});
			secoes = secoes.concat(secoesFeirasEMencaoHonrosa());
			relatorioPdfService.tabelas({
				titulo: 'Ranking - Destaques',
				subtitulo: 'MOVACI ' + new Date().getFullYear(),
				orientacao: 'landscape',
				secoes: secoes,
				arquivo: new Date().getFullYear() + '_Ranking_Destaques'
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
			GRUPOS_EIXOS.forEach(function(grupo) {
				grupo.eixos.forEach(function(eixo) {
					topN(eixo.chave, $scope.numPremiadosPorEixo).forEach(function(p, i) {
						premiados.push({ id: p._id, colocacao: i + 1 });
					});
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
					ano: new Date(Date.now()).getFullYear(),
					numPremiadosPorEixo: $scope.numPremiadosPorEixo,
					premiados: premiados
				})
				.success(function(data) {
					$mdDialog.show($mdDialog.alert()
						.title('Premiados confirmados')
						.textContent(data.marcados + ' projeto(s) marcado(s) como Premiado.')
						.ok('Entendi')
						.targetEvent(ev));
					// Recarrega do servidor pra os totais de premiados (painel do topo e de
					// cada categoria) refletirem o resultado de imediato, sem precisar dar F5.
					carregarProjetos();
				})
				.error(function(status) {
					$mdDialog.show($mdDialog.alert()
						.title('Falha ao confirmar')
						.textContent('Não foi possível confirmar os premiados. ' + status)
						.ok('Entendi')
						.targetEvent(ev));
				});
			}, function() {});
		};
	});
})();
