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

		adminAPI.getCategorias()
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
			{nome:'nomeOrientador1', email:'emailOrientador1', cpf:'cpfOrientador1', telefone:'telefoneOrientador1', camiseta:'tamCamisetaOrientador1'}
		];
		$scope.dynamicFields2 = [
			{nome:'nomeAluno1', email:'emailAluno1', cpf:'cpfAluno1', telefone:'telefoneAluno1', camiseta:'tamCamisetaAluno1'}
		];

		$scope.btnAdd1 = true;
		$scope.btnAdd2 = true;
		$scope.count1 = 1;
		$scope.count2 = 1;

		$scope.addOrientador = function() {
			$scope.count1++;
			$scope.dynamicFields1.push(
				{nome:'nomeOrientador'+$scope.count1, email:'emailOrientador'+$scope.count1, cpf:'cpfOrientador'+$scope.count1, telefone:'telefoneOrientador'+$scope.count1, camiseta:'tamCamisetaOrientador'+$scope.count1}
			);
			if ($scope.count1 === 2) {
				$scope.btnAdd1 = false;
			}
		};
		$scope.addAluno = function() {
			$scope.count2++;
			$scope.dynamicFields2.push(
				{nome:'nomeAluno'+$scope.count2, email:'emailAluno'+$scope.count2, cpf:'cpfAluno'+$scope.count2, telefone:'telefoneAluno'+$scope.count2, camiseta:'tamCamisetaAluno'+$scope.count2}
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
				{nome:'nomeOrientador1', email:'emailOrientador1', cpf:'cpfOrientador1', telefone:'telefoneOrientador1', camiseta:'tamCamisetaOrientador1'}
			];
			$scope.dynamicFields2 = [
				{nome:'nomeAluno1', email:'emailAluno1', cpf:'cpfAluno1', telefone:'telefoneAluno1', camiseta:'tamCamisetaAluno1'}
			];
			$scope.palavrasChave = [];
			$scope.eixos = [];
			$rootScope.cidades = [];
			$scope.loginHabilitado = false;
			$scope.emailDuplicado = false;
		};

		

	});
})();
