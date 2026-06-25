(function(){
	'use strict';

	angular
	.module('PDIAP')
	.controller('registroCtrl', function($scope, $rootScope, $mdDialog, $mdConstant, $q, $window, $location, $timeout, projetosAPI) {
	
		// Estado geral da tela de inscrição.
		$scope.cadastro_projetos = true;
		
		// Busca configurações de liberação da página de cadastro.
		$scope.carregarEdits = function(){
			projetosAPI.getEdits().success(function(edits){
				if(edits[0].cadastro_projetos == false){
					/*$scope.cadastro_projetos = false;				
					let showConfirmDialog = function(ev) {
						var confirm = $mdDialog.alert()
						.title('Página bloqueada!')
						.textContent('Esta pagina não está disponível no momento!')
						.ariaLabel('Esta pagina não está disponível no momento!')
						.targetEvent(ev)
						.theme('error')
						.ok('OK, Voltar')
						.escapeToClose(false)
						$mdDialog.show(confirm).then(function() {
							$window.location.href="http://movaci.com.br/";
						}, function() {});
					};
					showConfirmDialog();*/
				}	
			})
			.error(function(status) {
				console.log(status);
			});
		}
		$scope.carregarEdits();

		$scope.registro = false;
		$scope.loginHabilitado = false;
		$scope.usernameDuplicado = false;
		$scope.eixos = [];
		$scope.cidades = [];
		$scope.usernames = [];
		$scope.escolas = [];

		// Envia o projeto ao backend e trata a resposta de sucesso ou erro.
		$scope.registrarProjeto = function(projeto) {
			projeto.palavraChave = $scope.palavrasChave;
			projetosAPI.saveProjeto(projeto)
			.success(function(projeto, status) {
				if (status === 202) {
					$scope.usernameDuplicado = true;
					$scope.projetoForm.username.$setValidity('duplicado',false);
					// console.log('user duplicado: '+$scope.usernameDuplicado);
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

		projetosAPI.getCategorias()
		.success(function(data) {
			$scope.listaCategorias = data.categorias;
		})
		.error(function(status) {
			console.log(status);
		});

		projetosAPI.getEstados()
		.success(function(data) {
			$scope.listaEstados = data.estados;
		})
		.error(function(status) {
			console.log(status);
		});

		$scope.selectEixos = function(cat) {
			angular.forEach($scope.listaCategorias, function (value, key){
				//verifica a categoria selecionada
				// console.log(value.categoria);
				if(cat === value.categoria){
					// console.log(value.eixos);
					$scope.eixos = [];
					//adiciona os eixos em $scope.eixos
					for (var i in value.eixos) {
						$scope.eixos.push(value.eixos[i]);
					}
				}
			});
		};

		$scope.selectCidades = function(cid) {
			angular.forEach($scope.listaEstados, function (value, key) {
				//verifica o estado selecionado
				// console.log(value.nome);
				if(cid === value.nome){
					// console.log(value.cidades);
					$scope.cidades = [];
					//adiciona as cidades em $scope.cidades
					for (var x in value.cidades) {
						$scope.cidades.push(value.cidades[x]);
					}
				}
			});
		};

		// Estrutura inicial dos campos dinâmicos para orientadores e alunos.
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
			// refatorar: tirar count2--
			//  if ($scope.dynamicFields2.length !== 3) {
				// $scope.btnAdd2 = true;
			// }
			$scope.count2--;
			if ($scope.count2 !== 3) {
				$scope.btnAdd2 = true;
			}
			console.log($scope.dynamicFields2.length);
		};

		projetosAPI.getUsersEscolas()
		.success(function(data) {
			angular.forEach(data, function (value) {
				if (value.username !== undefined) {
					$scope.usernames.push(value.username);
				}
				if (value.nomeEscola !== undefined) {
					let escolaIdem = false;
					for (var i in $scope.escolas) {
						if (value.nomeEscola === $scope.escolas[i]) {
							escolaIdem = true;
							break;
						}
					}
					if (escolaIdem === false) {
						$scope.escolas.push(value.nomeEscola);
					}
				}
			});
		});

		$scope.verificaUsername = function(username) {
			let valido = true;
			for (var i in $scope.usernames) {
				if ($scope.usernames[i] == username) {
					valido = false;
					//$scope.projetoForm.username.$setValidity('duplicado',false);
					break; // importante parar caso email seja igual, senão não funciona
				} /*else {
					valido = true;
					//$scope.projetoForm.username.$setValidity('duplicado',true);
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
      

		// Valida CPF para brasileiros e aceita documentos simples para outros países.
		function _validateCPF(cpf) {
			cpf = cpf.replace(/\D+/g, '');
			if (cpf.length !== 11 || /^([0-9])\1+$/.test(cpf)) return false;
			var sum = 0, rest;
			for (var i = 1; i <= 9; i++) sum = sum + parseInt(cpf.substring(i-1, i)) * (11 - i);
			rest = (sum * 10) % 11;
			if ((rest === 10) || (rest === 11)) rest = 0;
			if (rest !== parseInt(cpf.substring(9, 10))) return false;
			sum = 0;
			for (i = 1; i <= 10; i++) sum = sum + parseInt(cpf.substring(i-1, i)) * (12 - i);
			rest = (sum * 10) % 11;
			if ((rest === 10) || (rest === 11)) rest = 0;
			if (rest !== parseInt(cpf.substring(10, 11))) return false;
			return true;
		}

		// Marca os campos de documento como válidos ou inválidos com base na nacionalidade.
		$scope.validarDocumento = function(valor, nacionalidade, index, tipo) {
			var digits = (valor || '').toString().replace(/\D+/g, '');
			var fieldName = '';
			if (tipo === 'orientador') {
				fieldName = 'cpfOrientador' + (index + 1);
			} else {
				fieldName = 'cpfAluno' + (index + 1);
			}
			var valido = false;
			if (nacionalidade === 'brasileiro') {
				valido = _validateCPF(digits);
			} else {
				valido = digits.length >= 5;
			}

			// Try to get ngModelController from DOM element (robust for dynamic names/ng-forms)
			try {
				var els = document.getElementsByName(fieldName);
				if (els && els.length > 0) {
					var el = els[0];
					var ngModelCtrl = angular.element(el).controller('ngModel');
					if (ngModelCtrl && typeof ngModelCtrl.$setValidity === 'function') {
						ngModelCtrl.$setValidity('documento', valido);
					}
				}
			} catch (e) {
				// fallback: try setting on projetoForm if available
				var control = $scope.projetoForm && $scope.projetoForm[fieldName];
				if (control && typeof control.$setValidity === 'function') {
					control.$setValidity('documento', valido);
				}
			}

			return valido;
		};
		
//        $scope.showRequisitosDialog = function(ev) {
//			$mdDialog.show(
//			  $mdDialog.alert()
//				.parent(angular.element(document.querySelector('#popupContainer')))
//				.clickOutsideToClose(true)
//				.title('Requisitos')
//				.textContent('Os seguintes requisitos são necessários para a produção do resumo: apresentação do tema, objetivos, metodologia e resultados obtidos/resultados esperados.')
//				.ariaLabel('Requisitos para resumo')
//				.ok('Entendi')
//				.targetEvent(ev)
//			);
//		};

		// Limpa os dados do formulário após o cadastro bem-sucedido.
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
			$scope.cidades = [];
			$scope.loginHabilitado = false;
			$scope.emailDuplicado = false;
		};

	});
})();
