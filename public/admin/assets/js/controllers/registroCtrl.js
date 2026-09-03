(function(){
	'use strict';

	angular
	.module('PDIAPa')
	.controller('registroCtrl', function($scope, $rootScope, $mdDialog, $mdConstant, $q, $window, $location, $timeout, adminAPI) {
	
		$scope.registro = false;
		$scope.loginHabilitado = false;
		$scope.usernameDuplicado = false;
		$scope.eixos = [];
		$rootScope.cidades = [];
		$scope.usernames = [];
		$scope.escolas = [];

		// Lista de escolas pra seleção na aba Instituição de editar-projetos.html -
		// mostraEscolas traz qualquer status (é a rota usada pela tela de gestão de
		// escolas), então filtra só as aprovadas aqui, mesmo critério da rota pública
		// getEscolasInfo usada na inscrição.
		adminAPI.getEscolas()
		.success(function(data) {
			$scope.escolas = (data || []).filter(function(e) { return e.status === 'aprovada'; });
		})
		.error(function(status) {
			console.log('Erro ao carregar escolas: '+status);
		});

		function preencherEnderecoDaEscolaInstituicao(escola) {
			$scope.projeto2.escola = escola._id;
			if (escola.estado) {
				$scope.projeto2.estado = escola.estado;
				$rootScope.selectCidades(escola.estado);
			}
			if (escola.cidade) $scope.projeto2.cidade = escola.cidade;
			if (escola.cep) $scope.projeto2.cep = escola.cep;
		}

		function atualizarValidadeEscolaInstituicao() {
			var valido = !$scope.projeto2.nomeEscola || !!$scope.projeto2.escola;
			$scope.projetoForm2.nomeEscola.$setValidity('escolaSelecionada', valido);
		}

		$scope.escolaSelecionadaInstituicao = function(item) {
			$scope.projeto2.escola = item ? item._id : undefined;
			if (item) preencherEnderecoDaEscolaInstituicao(item);
			atualizarValidadeEscolaInstituicao();
		};

		$scope.escolaTextoAlteradoInstituicao = function() {
			if ($scope.projeto2.escola) {
				var atual = $scope.escolas.filter(function(e) { return e._id === $scope.projeto2.escola; })[0];
				if (!atual || atual.nome !== $scope.projeto2.nomeEscola) {
					$scope.projeto2.escola = undefined;
				}
			}
			atualizarValidadeEscolaInstituicao();
		};

		$scope.escolaNaoEncontradaInstituicao = function(nomeDigitado, ev) {
			$mdDialog.show({
				controller: function dialogController($scope, $mdDialog) {
					$scope.escola = { nome: nomeDigitado || '' };
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
					});
					$scope.confirmar = function() {
						$mdDialog.hide($scope.escola);
					};
					$scope.cancel = function() {
						$mdDialog.cancel();
					};
				},
				templateUrl: '/views/details.solicitar-escola.html',
				parent: angular.element(document.body),
				targetEvent: ev,
				clickOutsideToClose: false
			}).then(function(escolaSolicitada) {
				escolaSolicitada.origem = 'inline_inscricao';
				adminAPI.solicitarEscola(escolaSolicitada)
				.success(function(escolaCriada) {
					$scope.escolas.push(escolaCriada);
					$scope.projeto2.nomeEscola = escolaCriada.nome;
					preencherEnderecoDaEscolaInstituicao(escolaCriada);
					atualizarValidadeEscolaInstituicao();
				})
				.error(function(status) {
					console.log('Erro ao solicitar escola: '+status);
				});
			}, function() {});
		};

		$scope.registrarProjeto = function(projeto) {
			projeto.palavraChave = $scope.palavrasChave;
			adminAPI.saveProjeto(projeto)
			.success(function(projeto, status) {
				if (status === 202) {
					$scope.usernameDuplicado = true;
					$scope.projetoForm.username.$setValidity('duplicado',false);
				} else if (projeto !== 'error') {
					$scope.registro = true;
					let showConfirmDialog = function(ev) {
						var confirm = $mdDialog.confirm()
						.title('Parabéns!')
						.textContent('Inscrição realizada com sucesso!')
						.ariaLabel('Inscrição realizada com sucesso!')
						.targetEvent(ev)
						.ok('OK, Voltar')
						.cancel('Nova Inscrição');
						$mdDialog.show(confirm).then(function() {
							$window.location.href="http://movaci.com.br/";
						}, function() {});
					};
					showConfirmDialog();
					resetForm();
				} else {
					$scope.registro = false;
					let showConfirmDialog = function(ev) {
						var confirm = $mdDialog.confirm()
						.title('Ops...')
						.textContent('A inscrição não foi realizada. Tente novamente ou então, entre em contato conosco.')
						.ariaLabel('A inscrição não foi realizada.')
						.targetEvent(ev)
						.theme('error')
						.ok('Continuar')
						.cancel('Entrar em contato');
						$mdDialog.show(confirm).then(function() {}
						, function() {
							$window.location.href="http://movaci.com.br/contato";
						});
					};
					showConfirmDialog();
				}
			})
			.error(function(status) {
				$scope.registro = false;
				console.log(status);
				let showConfirmDialog = function(ev) {
					var confirm = $mdDialog.confirm()
					.title('Ops...')
					.textContent('A inscrição não foi realizada. Tente novamente ou então, entre em contato conosco.')
					.ariaLabel('A inscrição não foi realizada.')
					.targetEvent(ev)
					.theme('error')
					.ok('Continuar')
					.cancel('Entrar em contato');
					$mdDialog.show(confirm).then(function() {}
					, function() {
						$window.location.href="http://movaci.com.br/contato";
					});
				};
				showConfirmDialog();
			});
		};

		$scope.emails = [];
		$scope.loadEmails = function() {
			$scope.emails = [];
			return $timeout(function() {
				if ($scope.projeto.emailOrientador1 !== undefined && $scope.emails.indexOf($scope.projeto.emailOrientador1) === -1) {
					$scope.emails.push($scope.projeto.emailOrientador1);
				}
				if ($scope.projeto.emailOrientador2 !== undefined && $scope.emails.indexOf($scope.projeto.emailOrientador2) === -1) {
					$scope.emails.push($scope.projeto.emailOrientador2);
				}
				if ($scope.projeto.emailAluno1 !== undefined && $scope.emails.indexOf($scope.projeto.emailAluno1) === -1) {
					$scope.emails.push($scope.projeto.emailAluno1);
				}
				if ($scope.projeto.emailAluno2 !== undefined && $scope.emails.indexOf($scope.projeto.emailAluno2) === -1) {
					$scope.emails.push($scope.projeto.emailAluno2);
				}
				if ($scope.projeto.emailAluno3 !== undefined && $scope.emails.indexOf($scope.projeto.emailAluno3) === -1) {
					$scope.emails.push($scope.projeto.emailAluno3);
				}
			}, 650);
		};

		adminAPI.getCategoriasEixos(new Date().getFullYear())
		.success(function(data) {
			$scope.listaCategorias = data.categorias;
		})
		.error(function(status) {
			console.log("Erro categorias:"+status);
		});

		adminAPI.getEstados()
		.success(function(data) {
			$scope.listaEstados = data.estados;
		})
		.error(function(status) {
			console.log("Erro estados:"+status);
		});
		
				

		$rootScope.selectEixos = function(cat) {
			angular.forEach($scope.listaCategorias, function (value, key){
				if(cat === value.categoria){
					$scope.eixos = [];
					for (var i in value.eixos) {
						$scope.eixos.push(value.eixos[i]);
					}
				}
			});
		};

		$rootScope.selectCidades = function(cid) {
			angular.forEach($scope.listaEstados, function (value, key) {
				if(cid === value.nome){
					$rootScope.cidades = [];
					for (var x in value.cidades) {
						$rootScope.cidades.push(value.cidades[x]);
					}
				}
			});
		};

		$scope.dynamicFields1 = [
			{nome:'nomeOrientador1', email:'emailOrientador1', cpf:'cpfOrientador1', telefone:'telefoneOrientador1', camiseta:'tamCamisetaOrientador1', nacionalidade:'nacionalidadeOrientador1'}
		];
		$scope.dynamicFields2 = [
			{nome:'nomeAluno1', email:'emailAluno1', cpf:'cpfAluno1', telefone:'telefoneAluno1', camiseta:'tamCamisetaAluno1', nacionalidade:'nacionalidadeAluno1'}
		];

		$scope.btnAdd1 = true;
		$scope.btnAdd2 = true;
		$scope.count1 = 1;
		$scope.count2 = 1;

		$scope.addOrientador = function() {
			$scope.count1++;
			$scope.dynamicFields1.push(
				{nome:'nomeOrientador'+$scope.count1, email:'emailOrientador'+$scope.count1, cpf:'cpfOrientador'+$scope.count1, telefone:'telefoneOrientador'+$scope.count1, camiseta:'tamCamisetaOrientador'+$scope.count1, nacionalidade:'nacionalidadeOrientador'+$scope.count1}
			);
			if ($scope.count1 === 2) {
				$scope.btnAdd1 = false;
			}
		};
		$scope.addAluno = function() {
			$scope.count2++;
			$scope.dynamicFields2.push(
				{nome:'nomeAluno'+$scope.count2, email:'emailAluno'+$scope.count2, cpf:'cpfAluno'+$scope.count2, telefone:'telefoneAluno'+$scope.count2, camiseta:'tamCamisetaAluno'+$scope.count2, nacionalidade:'nacionalidadeAluno'+$scope.count2}
			);
			if ($scope.count2 === 3) {
				$scope.btnAdd2 = false;
			}
		};

		$scope.removeOrientador = function(index) {
			$scope.dynamicFields1.splice(index, 1);
			$scope.count1--;
			if ($scope.count1 !== 2) {
				$scope.btnAdd1 = true;
			}
		};
		$scope.removeAluno = function(index) {
			$scope.dynamicFields2.splice(index, 1);
			$scope.count2--;
			if ($scope.count2 !== 3) {
				$scope.btnAdd2 = true;
			}
			console.log($scope.dynamicFields2.length);
		};


		$scope.verificaUsername = function(username) {
			let valido = true;
			for (var i in $scope.usernames) {
				if ($scope.usernames[i] == username) {
					valido = false;
					//$scope.projetoForm.username.$setValidity('duplicado',false);
					break; // importante parar caso email seja igual, senão não funciona
				} /*else {
					$scope.projetoForm.username.$setValidity('duplicado',true);
				}*/
			}
			$scope.projetoForm.username.$setValidity('duplicado',valido);
		};

		$scope.alunosArray = [];

		$scope.montarIntegrantes = function(projeto) {
			$scope.alunosArray = [];
			for (var i = 1; i <= $scope.dynamicFields2.length; i++) {
				if (i === 1) {
					$scope.alunosArray.push(projeto.nomeAluno1);
				}
				if (i === 2) {
					$scope.alunosArray.push(projeto.nomeAluno2);
				}
				if (i === 3) {
					$scope.alunosArray.push(projeto.nomeAluno3);
				}
			}
		};

		

		$scope.habilitarLogin = function() {
			return $scope.loginHabilitado = true;
		};

		$scope.keys = [$mdConstant.KEY_CODE.ENTER, $mdConstant.KEY_CODE.COMMA];
		$scope.palavrasChave = [];

		$scope.checkValidate = function(palavra) {
			if (palavra.length === 5) {
				$scope.palavrasChave.splice(6, 1);
				$scope.msg = 'aaa';
			}
		}

		let resetForm = function() {
			delete $scope.projeto;
			$scope.projetoForm.$setPristine();
			$scope.projetoForm.$setUntouched();
			$scope.hospedagemVerify = '';
			$scope.btnAdd1 = true;
			$scope.btnAdd2 = true;
			$scope.count1 = 1;
			$scope.count2 = 1;
			$scope.dynamicFields1 = [
				{nome:'nomeOrientador1', email:'emailOrientador1', cpf:'cpfOrientador1', telefone:'telefoneOrientador1', camiseta:'tamCamisetaOrientador1', nacionalidade:'nacionalidadeOrientador1'}
			];
			$scope.dynamicFields2 = [
				{nome:'nomeAluno1', email:'emailAluno1', cpf:'cpfAluno1', telefone:'telefoneAluno1', camiseta:'tamCamisetaAluno1', nacionalidade:'nacionalidadeAluno1'}
			];
			$scope.palavrasChave = [];
			$scope.eixos = [];
			$rootScope.cidades = [];
			$scope.loginHabilitado = false;
			$scope.emailDuplicado = false;
		};

		

	});
})();
