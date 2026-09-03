(function(){
	'use strict';

	angular
	.module('PDIAPa')
	.controller('avaliadoresCtrl', function($scope, $window, $location, $mdDialog, $filter, adminAPI, documentoValidatorService, relatorioPdfService) {

		$scope.avaliadores = [];
		$scope.count = 0;
		$scope.avaliador = { categoriasEixos: [], disponibilidade: [] };

		$scope.year = CadastraAno();

		$scope.listaCategorias = [];
		adminAPI.getCategoriasEixos(new Date().getFullYear())
		.success(function(data) {
			$scope.listaCategorias = data.categorias;
		})
		.error(function(status) {
			console.log(status);
		});

		$scope.listaDias = [];
		adminAPI.getDiasAvaliacao(new Date().getFullYear())
		.success(function(data) {
			$scope.listaDias = data.dias;
		})
		.error(function(status) {
			console.log(status);
		});

		// Valida o documento contra QUALQUER nacionalidade suportada, não só a
		// selecionada no form (ver documentoValidatorService).
		$scope.validarDocumento = function(valor) {
			var checagem = documentoValidatorService.validarDocumento(valor);
			if ($scope.avaliadoresForm && $scope.avaliadoresForm.cpf) {
				$scope.avaliadoresForm.cpf.$setValidity('documento', checagem.valido);
			}
			return checagem.valido;
		};

		$scope.registrarAvaliador = function(avaliador) {
			// Cadastra o avaliador no ano selecionado no filtro do cabeçalho, em vez de
			// sempre no ano atual (permite inserir avaliadores de anos anteriores).
			avaliador.ano = $scope.ano;
			adminAPI.saveAvaliador(avaliador)
			.success(function(data, status) {
				if (data === 'success') {
					let showConfirmDialog = function(ev) {
						var confirm = $mdDialog.confirm()
						.title('Parabéns!')
						.textContent('Inscrição realizada com sucesso!')
						.ariaLabel('Inscrição realizada com sucesso!')
						.targetEvent(ev)
						.ok('OK')
						$mdDialog.show(confirm);
					};
					showConfirmDialog();
					resetForm();
					$scope.recarregar();
				} else {
					let showConfirmDialog = function(ev) {
						var confirm = $mdDialog.confirm()
						.title('Ops...')
						.textContent('A inscrição não foi realizada. Por favor, tente novamente.')
						.ariaLabel('A inscrição não foi realizada.')
						.targetEvent(ev)
						.theme('error')
						.ok('OK');
						$mdDialog.show(confirm);
					};
					showConfirmDialog();
				}
			})
			.error(function(status) {
				let showConfirmDialog = function(ev) {
					var confirm = $mdDialog.confirm()
					.title('Ops...')
					.textContent('A inscrição não foi realizada. Por favor, tente novamente.')
					.ariaLabel('A inscrição não foi realizada.')
					.targetEvent(ev)
					.theme('error')
					.ok('OK');
					$mdDialog.show(confirm);
				};
				showConfirmDialog();
				console.log(status);
			});
		};

		// Marca como duplicado qualquer avaliador cujo nome OU documento se repita na lista -
		// ver captura de tela do usuário: mesmo nome com documentos diferentes também conta,
		// já que costuma ser a mesma pessoa cadastrada mais de uma vez.
		let marcarDuplicados = function() {
			var contagemNome = {}, contagemDoc = {};
			angular.forEach($scope.avaliadores, function(a) {
				var chaveNome = (a.nome || '').trim().toLowerCase();
				var chaveDoc = (a.cpfCru || '').trim();
				if (chaveNome) contagemNome[chaveNome] = (contagemNome[chaveNome] || 0) + 1;
				if (chaveDoc) contagemDoc[chaveDoc] = (contagemDoc[chaveDoc] || 0) + 1;
			});
			angular.forEach($scope.avaliadores, function(a) {
				var chaveNome = (a.nome || '').trim().toLowerCase();
				var chaveDoc = (a.cpfCru || '').trim();
				a.duplicado = (chaveNome && contagemNome[chaveNome] > 1) || (chaveDoc && contagemDoc[chaveDoc] > 1);
			});
		};

		// Filtro de busca por nome ou documento (CPF/cédula), usado no campo de busca da tela.
		$scope.buscaTexto = '';
		$scope.filtroAvaliador = function(ava) {
			if (!$scope.buscaTexto) return true;
			var termo = $scope.buscaTexto.trim().toLowerCase();
			var nome = (ava.nome || '').toLowerCase();
			var doc = (ava.cpfCru || '').toLowerCase();
			return nome.indexOf(termo) !== -1 || doc.indexOf(termo) !== -1;
		};

		let mostraAvaliadores = function() {
			adminAPI.getAvaliadores()
			.success(function(avaliadores){
				angular.forEach(avaliadores, function (value, key) {
					var index = $scope.avaliadores.map(function(a) { return a._id; }).indexOf(value._id);
					if (index === -1) {
						if(value.avaliacao === true) $scope.count++;
						var ano = new Date(value.createdAt).getFullYear();
						if(ano == $scope.ano){
							var cpf = formatCPF(value.cpf);
							/*var avaliacao = false;
							if(value.avaliacao !== undefined) avaliacao = value.avaliacao;*/
							let avaliador = ({
								_id: value._id,
								nome: value.nome,
								email: value.email,
								nacionalidade: value.nacionalidade,
								cpf: cpf,
								cpfCru: value.cpf,
								rg: value.rg,
								dtNascimento: value.dtNascimento,
								nivelAcademico: value.nivelAcademico,
								categoriasEixos: value.categoriasEixos || [],
								categoriasEixosAvaliados: value.categoriasEixosAvaliados || [],
								atuacaoProfissional: value.atuacaoProfissional,
								tempoAtuacao: value.tempoAtuacao,
								telefone: value.telefone,
								curriculo: value.curriculo,
								disponibilidade: value.disponibilidade || [],
								avaliacao: value.avaliacao,
								ano: ano
							});
							$scope.avaliadores.push(avaliador);
						}
					}
				});
				marcarDuplicados();
			})
			.error(function(status) {
				console.log("Error: "+status);
			});
		};
		$scope.mostraAvaliadores = mostraAvaliadores();

		$scope.recarregar = function(){
			$scope.avaliadores = [];
			$scope.count = 0;
			$scope.idAvaliadoresMarcados = [];
			$scope.idAvaliadoresNMarcados = [];
			mostraAvaliadores();
		}

		// PDF da lista de avaliadores (mesma lib pdfMake já usada pros certificados, ver
		// homeCtrl.js#emitirCertificado1) - exporta exatamente o que está filtrado/ordenado
		// na tela (busca + ordenação), não a lista inteira sem filtro.
		$scope.imprimirPDF = function() {
			var lista = $filter('orderBy')($filter('filter')($scope.avaliadores, $scope.filtroAvaliador), $scope.ordenacao);
			relatorioPdfService.tabela({
				titulo: 'Avaliadores - ' + $scope.ano,
				subtitulo: lista.length + ' avaliador(es)',
				orientacao: 'landscape',
				colunas: [
					{ texto: 'Nome', largura: '20%' },
					{ texto: 'CPF', largura: '12%' },
					{ texto: 'Categoria(s)/Eixo(s)', largura: '30%' },
					{ texto: 'Disponibilidade', largura: '23%' },
					{ texto: 'Presença', largura: '10%' }
				],
				linhas: lista.map(function(ava) {
					return [
						ava.nome || '',
						ava.cpf || '',
						(ava.categoriasEixos || []).map(function(ce) { return ce.categoria + ' - ' + ce.eixo; }).join('\n'),
						(ava.disponibilidade || []).map(function(dt) { return dt.data + ' - ' + dt.turno; }).join('\n'),
						ava.avaliacao ? 'Sim' : 'Não'
					];
				})
			});
		};

		let formatCPF = function(cpf) {
			if (cpf !== undefined) {
				cpf = cpf.substring(0,3) + "." + cpf.substring(3);
				cpf = cpf.substring(0,7) + "." + cpf.substring(7);
				cpf = cpf.substring(0,11) + "-" + cpf.substring(11);
				return cpf;
			}
		};

		$scope.idAvaliadoresMarcados = [];
		$scope.idAvaliadoresNMarcados = [];
		$scope.contador = function(check,idAva) {
			if (check) {
				$scope.count--;
				let index = $scope.idAvaliadoresMarcados.indexOf(idAva);
				if (index !== -1) {
					$scope.idAvaliadoresMarcados.splice(index, 1);
				}
				$scope.idAvaliadoresNMarcados.push(idAva);
			}
			else {
				$scope.count++;
				let index = $scope.idAvaliadoresNMarcados.indexOf(idAva);
				if (index !== -1) {
					$scope.idAvaliadoresNMarcados.splice(index, 1);
				}
				$scope.idAvaliadoresMarcados.push(idAva);
			}
		}

		$scope.update = function() {		
			adminAPI.putSetAvaliadores($scope.idAvaliadoresMarcados,$scope.idAvaliadoresNMarcados)
			.success(function(data, status) {
				$scope.toast('Avaliador(es) atualizado(s) com sucesso!','success-toast');
				var count = 0;
				if ($scope.idAvaliadoresMarcados.length !== 0) {
							angular.forEach($scope.avaliadores, function (value, key) {
								for (var x = 0; x < $scope.idAvaliadoresMarcados.length; x++) {
									if (value._id === $scope.idAvaliadoresMarcados[x]) {
										$scope.avaliadores[count].avaliacao = true;
									}
								}
								count++;
							});						
					count = 0;
				}
				if ($scope.idAvaliadoresNMarcados.length !== 0) {
							angular.forEach($scope.avaliadores, function (value, key) {
								for (var x = 0; x < $scope.idAvaliadoresNMarcados.length; x++) {
									if (value._id === $scope.idProjetosReprovados[x]) {
										$scope.avaliadores[count].avaliacao = false;
									}
								}
								count++;
							});
				}
			})
			.error(function(status) {
				console.log('Error: '+status);
			});
		}

		$scope.removerAvaliador = function(ev,id,nome) {
			var confirm = $mdDialog.confirm()
			.textContent('Deseja remover o avaliador '+nome+'?')
			.ariaLabel('Remover avaliador')
			.targetEvent(ev)
			.ok('Sim')
			.cancel('Não');
			$mdDialog.show(confirm).then(function() {
				adminAPI.putRemoveAvaliador(id)
				.success(function(data) {
					$scope.toast('Avaliador removido com sucesso!','success-toast');
					var index = $scope.avaliadores.map(function(e) { return e._id; }).indexOf(id);
					if (index !== -1) {
						if($scope.avaliadores[index].avaliacao === true) $scope.count--;
						$scope.avaliadores.splice(index, 1);
					}
				})
				.error(function(status) {
					$scope.toast('Falha.','failed-toast');
					console.log("Error: "+status);
				});
			}, function() {});
		};

		$scope.editarAvaliador = function(ev, avaliador) {
			var listaCategorias = $scope.listaCategorias;
			var listaDias = $scope.listaDias;
			var recarregar = $scope.recarregar;
			$mdDialog.show({
				controller: function dialogAvaliadorController($scope, $mdDialog, $mdToast, adminAPI, documentoValidatorService) {
					$scope.toast = function(message, tema) {
						var toast = $mdToast.simple().textContent(message).action('✖').position('top right').theme(tema).hideDelay(10000);
						$mdToast.show(toast);
					};
					$scope.avaliador = angular.copy(avaliador);
					$scope.avaliador.cpf = avaliador.cpfCru;
					$scope.avaliador.categoriasEixos = $scope.avaliador.categoriasEixos || [];
					$scope.avaliador.categoriasEixosAvaliados = $scope.avaliador.categoriasEixosAvaliados || [];
					$scope.avaliador.disponibilidade = $scope.avaliador.disponibilidade || [];
					$scope.listaCategorias = listaCategorias;
					$scope.listaDias = listaDias;

					// Marcação de quais combinações registradas ele avaliou de fato - separado
					// da presença em massa (checkbox da lista), pra não atrapalhar aquele fluxo.
					$scope.estaAvaliada = function(ce) {
						return $scope.avaliador.categoriasEixosAvaliados.some(function(a) {
							return a.categoria === ce.categoria && a.eixo === ce.eixo;
						});
					};
					$scope.toggleAvaliada = function(ce) {
						var lista = $scope.avaliador.categoriasEixosAvaliados;
						var index = lista.findIndex(function(a) { return a.categoria === ce.categoria && a.eixo === ce.eixo; });
						if (index === -1) lista.push({ categoria: ce.categoria, eixo: ce.eixo });
						else lista.splice(index, 1);
					};

					$scope.validarDocumento = function(valor) {
						var checagem = documentoValidatorService.validarDocumento(valor);
						if ($scope.avaliadorEditForm && $scope.avaliadorEditForm.cpf) {
							$scope.avaliadorEditForm.cpf.$setValidity('documento', checagem.valido);
						}
						return checagem.valido;
					};

					$scope.alterarAvaliador = function(avaliador) {
						// Só mantém como "avaliada" o que ainda está entre as combinações
						// registradas (ex: admin removeu uma combinação que já estava marcada).
						let categoriasEixosAvaliados = avaliador.categoriasEixosAvaliados.filter(function(a) {
							return avaliador.categoriasEixos.some(function(ce) { return ce.categoria === a.categoria && ce.eixo === a.eixo; });
						});
						let pacote = ({
							id: avaliador._id,
							nome: avaliador.nome,
							email: avaliador.email,
							nacionalidade: avaliador.nacionalidade,
							cpf: avaliador.cpf,
							rg: avaliador.rg,
							dtNascimento: avaliador.dtNascimento,
							nivelAcademico: avaliador.nivelAcademico,
							categoriasEixos: avaliador.categoriasEixos,
							categoriasEixosAvaliados: categoriasEixosAvaliados,
							atuacaoProfissional: avaliador.atuacaoProfissional,
							tempoAtuacao: avaliador.tempoAtuacao,
							telefone: avaliador.telefone,
							curriculo: avaliador.curriculo,
							disponibilidade: avaliador.disponibilidade
						});
						adminAPI.putAtualizaAvaliador(pacote)
						.success(function(data) {
							if (data === 'success') {
								$scope.toast('Avaliador atualizado com sucesso!', 'success-toast');
								$mdDialog.hide();
								recarregar();
							} else {
								$scope.toast('Falha ao atualizar. Verifique o documento informado.', 'failed-toast');
							}
						})
						.error(function(status) {
							$scope.toast('Falha ao atualizar. Verifique o documento informado.', 'failed-toast');
							console.log('Error: ' + status);
						});
					};
					$scope.hide = function() {
						$mdDialog.hide();
					};
					$scope.cancel = function() {
						$mdDialog.cancel();
					};
				},
				templateUrl: 'admin/views/details-edicao.avaliador.html',
				parent: angular.element(document.body),
				targetEvent: ev,
				clickOutsideToClose: false,
				fullscreen: true
			});
		};

		let resetForm = function() {
			delete $scope.avaliador;
			$scope.avaliador = { categoriasEixos: [], disponibilidade: [] };
			$scope.avaliadoresForm.$setPristine();
			$scope.avaliadoresForm.$setUntouched();
		};
	});
})();
