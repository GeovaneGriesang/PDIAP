(function(){
	'use strict';

	// Painel de pendências de dados que o fluxo normal do site não força a resolver: um
	// projeto pode acabar avaliado sem presença confirmada, empatado sem ninguém notar (o
	// empate só aparece visualmente no Ranking), ou avaliado sem nunca ter sido marcado
	// aprovado/reprovado (avaliador avalia direto, sem passar por Selecionar Aprovados).
	// Cada aba reaproveita o MESMO mecanismo de edição das telas de origem (mesmos diálogos/
	// rotas), só que a lista já vem filtrada pra só quem está inconsistente, então dá pra
	// corrigir tudo aqui mesmo sem precisar ir cata a projeto nas telas de origem.
	//
	// Aba Cadastro: problemas de cadastro (documento inválido, e-mail de outra pessoa, integrante
	// sem cadastro único...) - ver controllers/inconsistencias-cadastro-controller.js.
	angular
	.module('PDIAPa')
	.controller('inconsistenciasCtrl', function($scope, $rootScope, $timeout, $mdDialog, $mdToast, $http, adminAPI) {

		$scope.cadastro = null;
		var carregarCadastro = function() {
			$scope.cadastro = null;
			if (!$rootScope.mostraId) return;
			$http.get('/admin/inconsistencias/cadastro', { params: { mostraId: $rootScope.mostraId } }).then(function(response) {
				$scope.cadastro = response.data;
			}, function(response) { console.log(response.data); });
		};
		// Juntar cadastros da mesma pessoa (e-mail repetido) - só super-admin (mesclar-pessoas-controller.js).
		$scope.abrirJuncao = function(grupo) {
			grupo.abrindo = true;
			$http.get('/admin/pessoas/mesclagem', { params: { ids: grupo.pessoas.map(function(p) { return p._id; }).join(',') } }).then(function(response) {
				grupo.detalhes = response.data;
			}, function(response) {
				$scope.toast(typeof response.data === 'string' ? response.data : 'Não foi possível carregar os cadastros.', 'failed-toast');
			}).finally(function() { grupo.abrindo = false; });
		};
		$scope.juntar = function(grupo, manter, ev) {
			var outros = grupo.detalhes.filter(function(p) { return p._id !== manter._id; });
			var confirm = $mdDialog.confirm()
				.title('Juntar cadastros?')
				.textContent('Fica o cadastro de ' + manter.nome + ' (doc. ' + (manter.documento || '-') + '). ' +
					outros.map(function(p) { return p.nome + ' (doc. ' + (p.documento || '-') + ')'; }).join(', ') +
					' será apagado e tudo o que está ligado a ele passa pro que fica. Confirme que é a MESMA pessoa.')
				.targetEvent(ev).ok('Juntar').cancel('Cancelar');
			$mdDialog.show(confirm).then(function() {
				grupo.ocupado = true;
				var seguir = function(i) {
					if (i >= outros.length) {
						$scope.toast('Cadastros juntados em ' + manter.nome + '.', 'success-toast');
						outros.forEach(function(p) { tirarDoGrupo(grupo, p); });
						grupo.ocupado = false;
						return;
					}
					$http.post('/admin/pessoas/mesclar', { manterId: manter._id, removerId: outros[i]._id }).then(function() { seguir(i + 1); }, function(response) {
						$scope.toast(typeof response.data === 'string' ? response.data : 'Falha ao juntar.', 'failed-toast');
						outros.slice(0, i).forEach(function(p) { tirarDoGrupo(grupo, p); });
						grupo.ocupado = false;
					});
				};
				seguir(0);
			}, function() {});
		};
		// Atualiza só o grupo na tela (recarregar a lista inteira levava a página de volta pro topo):
		// a pessoa sai do grupo; grupo com 1 pessoa só deixa de ser e-mail repetido.
		var tirarDoGrupo = function(grupo, pessoa) {
			grupo.pessoas = grupo.pessoas.filter(function(p) { return p._id !== pessoa._id; });
			if (grupo.detalhes) grupo.detalhes = grupo.detalhes.filter(function(p) { return p._id !== pessoa._id; });
			if (grupo.pessoas.length <= 1) {
				var lista = $scope.cadastro.cadastroUnico.emailsRepetidos;
				lista.splice(lista.indexOf(grupo), 1);
			}
		};
		// Pessoas DIFERENTES com o mesmo e-mail: cada uma ganha o próprio (só super-admin).
		$scope.trocarEmail = function(grupo, pessoa, ev) {
			var dialogo = $mdDialog.prompt()
				.title('Trocar o e-mail de ' + pessoa.nome)
				.textContent('O novo e-mail vale para entrar na MOVACI e vai também para os cadastros de avaliador(a), participante e integrante de projeto desta pessoa. A senha continua a mesma.')
				.placeholder('novo e-mail').ariaLabel('Novo e-mail').initialValue('')
				.targetEvent(ev).ok('Trocar').cancel('Cancelar');
			$mdDialog.show(dialogo).then(function(email) {
				email = (email || '').trim();
				if (!email) return;
				grupo.ocupado = true;
				$http.post('/admin/pessoas/' + pessoa._id + '/email', { email: email }).then(function(response) {
					if (!response.data.alterados.length) return $scope.toast('Este já é o e-mail deste cadastro.', 'failed-toast');
					$scope.toast('E-mail de ' + pessoa.nome + ' trocado para ' + response.data.pessoa.email + '.', 'success-toast');
					tirarDoGrupo(grupo, pessoa);
				}, function(response) {
					$scope.toast(typeof response.data === 'string' ? response.data : 'Falha ao trocar o e-mail.', 'failed-toast');
				}).finally(function() { grupo.ocupado = false; });
			}, function() {});
		};

		$scope.totalCadastro = function() {
			var c = $scope.cadastro;
			if (!c) return 0;
			return c.integrantes.length + c.avaliadores.length + (c.cadastroUnico ? c.cadastroUnico.emailsRepetidos.length + c.cadastroUnico.pessoasComPendencia.length + c.cadastroUnico.semEmail.length : 0);
		};

		$scope.abaAtiva = 'semPresenca';
		$scope.mostras = [];

		// O <md-select>+ng-repeat de Mostras, ao ser preenchido de forma assíncrona (ver
		// adminAPI.getMostras() abaixo), religa cada <md-option> e reescreve o ng-model no
		// processo (bug conhecido do Angular Material com ng-repeat dentro de md-select) -
		// guarda o valor persistido ANTES e só carrega os projetos depois de reaplicá-lo,
		// senão a Mostra acaba travada no último item da lista.
		//
		// mostraId (o _id da Feira) é a chave de seleção de verdade - $rootScope.ano fica só
		// como valor DERIVADO, porque pode haver mais de uma Mostra no mesmo ano (ver
		// memória project-mostra-ano-nao-unico).
		let mostraIdPersistido = $rootScope.mostraId;
		let resolverMostraSelecionada = function() {
			$rootScope.mostraSelecionada = ($scope.mostras || []).filter(function(m) { return m._id === $rootScope.mostraId; })[0];
			$rootScope.ano = $rootScope.mostraSelecionada ? $rootScope.mostraSelecionada.ano : $rootScope.ano;
		};

		$scope.semPresenca = [];
		$scope.empatados = [];
		$scope.naoAprovado = [];

		// Mesma conta de "total" usada no Ranking (rankingCtrl.js#construirObjExibicao):
		// soma de todas as notas presentes (2, 3 ou mais avaliadores, +desempate se houver -
		// ver models/feira-schema.js, numAvaliadoresPorProjeto).
		function total(avaliacao) {
			if (!avaliacao || avaliacao.length === 0) return 0;
			return avaliacao.reduce(function(a, b) { return a + (Number(b) || 0); }, 0);
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
			.then(function(response) {
				angular.forEach(response.data, function(value) {
					if (!adminAPI.pertenceAMostra(value, $rootScope.mostraSelecionada)) return;
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

					// Avaliado (tem nota) e NINGUÉM do grupo com presença marcada: o grupo apresentou, mas
					// os alunos não conseguem emitir o certificado (que exige presença). Grupo com pelo
					// menos uma presença foi conferido por alguém - não entra.
					var algumaPresenca = (value.integrantes || []).some(function(i) { return i.presenca === true; });
					if (value.aprovado === true && !algumaPresenca) {
						$scope.semPresenca.push(obj);
					}
					if (value.aprovado === true) {
						avaliados.push(obj);
					} else {
						$scope.naoAprovado.push(obj);
					}
				});
				$scope.empatados = detectarEmpatados(avaliados);
			}, function(response) { console.log(response.data); });
		};

		adminAPI.getMostras()
		.then(function(response) {
			var mostras = response.data;
			$scope.mostras = mostras;
			$timeout(function() {
				if (mostraIdPersistido) $rootScope.mostraId = mostraIdPersistido;
				else if (!$rootScope.mostraId && mostras.length) $rootScope.mostraId = mostras[0]._id;
				resolverMostraSelecionada();
				carregarProjetos();
				carregarCadastro();
			});
		}, function(response) {
			console.log('Error: '+response.data);
			resolverMostraSelecionada();
			carregarProjetos();
		});
		$scope.recarregar = function() {
			resolverMostraSelecionada();
			carregarProjetos();
			carregarCadastro();
		};

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
						.then(function() {
							$scope.toast('Presença cadastrada com sucesso!', 'success-toast');
							$mdDialog.hide();
							carregarProjetos();
						}, function(response) {
							$scope.toast('Falha.', 'failed-toast');
							console.log('Error: ' + response.data);
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

		// --- Empatados: mesmo diálogo/rota de Avaliação > Lançar notas (ver
		// avaliacaoInserirCtrl.js#visualizarDetalhes + details.avaliacao.html). ---
		$scope.abrirDesempate = function(projeto, ev) {
			$mdDialog.show({
				controller: function dialogController($scope, $mdDialog, $mdToast, adminAPI) {
					$scope.details = projeto;
					$scope.desempate = false;
					$scope.habilitaDesempate = function() { $scope.desempate = !$scope.desempate; };
					$scope.addNotas = function(id, notas) {
						adminAPI.putAvaliacao(id, notas)
						.then(function() {
							$scope.toast('Avaliação realizada com sucesso!', 'success-toast');
							$mdDialog.hide();
							carregarProjetos();
						}, function(response) {
							$scope.toast('Falha.', 'failed-toast');
							console.log('Error: ' + response.data);
						});
					};
					// Mesmo mecanismo de avaliacaoInserirCtrl.js - remove uma nota lançada
					// errada, voltando o projeto a "sem nota nenhuma".
					$scope.confirmarRemoverNotas = function(ev) {
						var confirm = $mdDialog.confirm()
							.title('Remover notas?')
							.textContent('O projeto "' + $scope.details.nomeProjeto + '" vai voltar a ficar sem nenhuma nota lançada. Essa ação não pode ser desfeita.')
							.targetEvent(ev)
							.ok('Remover')
							.cancel('Cancelar');
						$mdDialog.show(confirm).then(function() {
							$scope.addNotas($scope.details._id, []);
						}, function() {});
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

		// --- Sem aprovação: mesmo seletor/rota de Projetos > Selecionar aprovados (ver
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
			.then(function() {
				$scope.toast('Projeto(s) atualizado(s) com sucesso!', 'success-toast');
				$scope.idProjetosAnais = [];
				$scope.idProjetosApresentacao = [];
				$scope.idProjetosReprovados = [];
				carregarProjetos();
			}, function(response) {
				$scope.toast('Falha ao salvar.', 'failed-toast');
				console.log('Error: ' + response.data);
			});
		};
	});
})();
