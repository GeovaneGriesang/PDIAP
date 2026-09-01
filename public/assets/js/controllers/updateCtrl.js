(function(){
	'use strict';

	angular
	.module('PDIAP')
	.controller('updateCtrl', function($scope, $rootScope, $parse, $location, $mdDialog, $mdToast, $timeout, projetosAPI, documentoValidatorService) {

		// $rootScope.header = 'Alterar projeto';
		$scope.alterado = false;
		$scope.orientadores = [];
		$scope.alunos = [];
		$scope.emails1 = [];

		$scope.opcoes = {};

		$scope.carregarOpcoes = function(){
			projetosAPI.getOpcoes().success(function(op){
				$scope.opcoes = op;
			})
			.error(function(status) {
				console.log(status);
			});
		}
		$scope.carregarOpcoes();

		$scope.update = function(projeto) {
			if (projeto.nomeProjeto !== undefined) {
				projeto.palavraChave = $scope.palavraChave;
			}
			projetosAPI.putProjeto(projeto)
			.success(function(projeto){
				$scope.alterado = true;
				$scope.toast('Alteração realizada com sucesso!','success-toast');
				$scope.carregarProjeto();
			})
			.error(function(status){
				console.log('update error: '+status);
				$scope.toast(status || 'Falha na alteração','failed-toast');
			});
		};

		$scope.limpaHospedagem = function() {
			$scope.projeto5.hospedagem = [];
		}

		let updateIntegrante = function(pacote) {
			projetosAPI.putIntegrante(pacote)
			.success(function(data, status){
				console.log(status);
				$scope.alterado = true;
				$scope.toast('Alteração realizada com sucesso!','success-toast');
			})
			.error(function(status){
				console.log('update error: '+status);
				$scope.toast('Falha na alteração','failed-toast');
			});
		};

		$scope.orientadoresUpdate = [];
		$scope.updateOrientadores = function() {
			$scope.orientadoresUpdate = [];
			for (var i = 1; i <= $scope.dynamicFields11.length; i++) {
				if (i == 1) {
					var pacote = ({
						tipo: 'Orientador',
						nome: $scope.projeto3.nomeOrientador1,
						email: $scope.projeto3.emailOrientador1,
						nacionalidade: $scope.projeto3.nacionalidadeOrientador1,
						cpf: $scope.projeto3.cpfOrientador1,
						telefone: $scope.projeto3.telefoneOrientador1,
						tamCamiseta: $scope.projeto3.tamCamisetaOrientador1,
						_id: $scope.projeto3.idOrientador1
					});
					$scope.orientadoresUpdate.push(pacote);
				}
				if (i == 2) {
					var pacote = ({
						tipo: 'Orientador',
						nome: $scope.projeto3.nomeOrientador2,
						email: $scope.projeto3.emailOrientador2,
						nacionalidade: $scope.projeto3.nacionalidadeOrientador2,
						cpf: $scope.projeto3.cpfOrientador2,
						telefone: $scope.projeto3.telefoneOrientador2,
						tamCamiseta: $scope.projeto3.tamCamisetaOrientador2,
						_id: $scope.projeto3.idOrientador2
					});
					$scope.orientadoresUpdate.push(pacote);
				}
			}
			updateIntegrante($scope.orientadoresUpdate);
			$scope.carregarProjeto();
			getIntegrantes();
			setTimeout($scope.refresh, 750);
		};

		$scope.alunosUpdate = [];
		$scope.updateAlunos = function() {
			$scope.alunosUpdate = [];
			for (var i = 1; i <= $scope.dynamicFields22.length; i++) {
				if (i == 1) {
					var pacote = ({
						tipo: 'Aluno',
						nome: $scope.projeto4.nomeAluno1,
						email: $scope.projeto4.emailAluno1,
						nacionalidade: $scope.projeto4.nacionalidadeAluno1,
						cpf: $scope.projeto4.cpfAluno1,
						telefone: $scope.projeto4.telefoneAluno1,
						tamCamiseta: $scope.projeto4.tamCamisetaAluno1,
						_id: $scope.projeto4.idAluno1
					});
					$scope.alunosUpdate.push(pacote);
				}
				if (i == 2) {
					var pacote = ({
						tipo: 'Aluno',
						nome: $scope.projeto4.nomeAluno2,
						email: $scope.projeto4.emailAluno2,
						nacionalidade: $scope.projeto4.nacionalidadeAluno2,
						cpf: $scope.projeto4.cpfAluno2,
						telefone: $scope.projeto4.telefoneAluno2,
						tamCamiseta: $scope.projeto4.tamCamisetaAluno2,
						_id: $scope.projeto4.idAluno2
					});
					$scope.alunosUpdate.push(pacote);
				}
				if (i == 3) {
					var pacote = ({
						tipo: 'Aluno',
						nome: $scope.projeto4.nomeAluno3,
						email: $scope.projeto4.emailAluno3,
						nacionalidade: $scope.projeto4.nacionalidadeAluno3,
						cpf: $scope.projeto4.cpfAluno3,
						telefone: $scope.projeto4.telefoneAluno3,
						tamCamiseta: $scope.projeto4.tamCamisetaAluno3,
						_id: $scope.projeto4.idAluno3
					});
					$scope.alunosUpdate.push(pacote);
				}
			}

			for (var i = 0; i < $scope.projeto5.hospedagem.length; i++) {
				let idem = false;
				angular.forEach($scope.alunosUpdate, function (value, key){
					if ($scope.projeto5.hospedagem[i] === value.nome) {
						idem = true;
					}
				});
				if (idem === false) {
					$scope.projeto5.hospedagem.splice(i, 1);
				}
			}

			let hosp = ({
				hospedagem: $scope.projeto5.hospedagem
			});
			projetosAPI.putProjeto(hosp)
			.success(function(data){
				 $scope.carregarProjeto();
			})
			.error(function(status){
				console.log('update error: '+status);
				$scope.toast('Falha na alteração','failed-toast');
			});

			updateIntegrante($scope.alunosUpdate);
			$scope.carregarProjeto();
			getIntegrantes();
			setTimeout($scope.refresh, 750);

			let showAlert = function(ev) {
				$mdDialog.show(
					$mdDialog.alert()
					.parent(angular.element(document.querySelector('#popupContainer3')))
					.clickOutsideToClose(false)
					.textContent('O(s) aluno(s) alterado(s) foram removidos da lista de hospedagem. Por favor, atualize-a.')
					.ok('OK')
					.targetEvent(ev)
				);
			};
		};

		let getIntegrantes = function() {
			projetosAPI.getProjeto()
			.success(function(data) {
				var x = 0;
				var y = 0;
				$scope.orientadores = [];
				$scope.alunos = [];
				angular.forEach(data.integrantes, function (value, key){
					if (value.tipo === 'Orientador') {
						$scope.orientadores.push(value);
						x++;
						var str0 = 'projeto3.idOrientador'+x;
						var str1 = 'projeto3.nomeOrientador'+x;
						var str2 = 'projeto3.emailOrientador'+x;
						var str3 = 'projeto3.cpfOrientador'+x;
						var str4 = 'projeto3.telefoneOrientador'+x;
						var str5 = 'projeto3.tamCamisetaOrientador'+x;
						var str6 = 'projeto3.nacionalidadeOrientador'+x;
						var model0 = $parse(str0);
						var model1 = $parse(str1);
						var model2 = $parse(str2);
						var model3 = $parse(str3);
						var model4 = $parse(str4);
						var model5 = $parse(str5);
						var model6 = $parse(str6);

						// A máscara BR (dígito a dígito) só faz sentido pra um CPF de 11 dígitos /
						// telefone de 10-11 dígitos - aplicar em documentos de outro formato
						// resultaria num valor com pontuação errada.
						if (value.cpf && value.cpf.length === 11) {
							value.cpf = value.cpf.substring(0,3) + "." + value.cpf.substring(3);
							value.cpf = value.cpf.substring(0,7) + "." + value.cpf.substring(7);
							value.cpf = value.cpf.substring(0,11) + "-" + value.cpf.substring(11);
						}

						if (value.telefone && (value.telefone.length === 10 || value.telefone.length === 11)) {
							value.telefone = "(" + value.telefone.substring(0);
							value.telefone = value.telefone.substring(0,3) + ")" + value.telefone.substring(3);
							value.telefone = value.telefone.substring(0,4) + " " + value.telefone.substring(4);
							value.telefone = value.telefone.substring(0,9) + "-" + value.telefone.substring(9);
						}

						model0.assign($scope, value._id);
						model1.assign($scope, value.nome);
						model2.assign($scope, value.email);
						model3.assign($scope, value.cpf);
						model4.assign($scope, value.telefone);
						model5.assign($scope, value.tamCamiseta);
						model6.assign($scope, value.nacionalidade);
					} else if (value.tipo === 'Aluno') {
						$scope.alunos.push(value);
						y++;
						var str0 = 'projeto4.idAluno'+y;
						var str1 = 'projeto4.nomeAluno'+y;
						var str2 = 'projeto4.emailAluno'+y;
						var str3 = 'projeto4.cpfAluno'+y;
						var str4 = 'projeto4.telefoneAluno'+y;
						var str5 = 'projeto4.tamCamisetaAluno'+y;
						var str6 = 'projeto4.nacionalidadeAluno'+y;
						var model0 = $parse(str0);
						var model1 = $parse(str1);
						var model2 = $parse(str2);
						var model3 = $parse(str3);
						var model4 = $parse(str4);
						var model5 = $parse(str5);
						var model6 = $parse(str6);

						if (value.cpf && value.cpf.length === 11) {
							value.cpf = value.cpf.substring(0,3) + "." + value.cpf.substring(3);
							value.cpf = value.cpf.substring(0,7) + "." + value.cpf.substring(7);
							value.cpf = value.cpf.substring(0,11) + "-" + value.cpf.substring(11);
						}

						if (value.telefone && (value.telefone.length === 10 || value.telefone.length === 11)) {
							value.telefone = "(" + value.telefone.substring(0);
							value.telefone = value.telefone.substring(0,3) + ")" + value.telefone.substring(3);
							value.telefone = value.telefone.substring(0,4) + " " + value.telefone.substring(4);
							value.telefone = value.telefone.substring(0,9) + "-" + value.telefone.substring(9);
						}

						model0.assign($scope, value._id);
						model1.assign($scope, value.nome);
						model2.assign($scope, value.email);
						model3.assign($scope, value.cpf);
						model4.assign($scope, value.telefone);
						model5.assign($scope, value.tamCamiseta);
						model6.assign($scope, value.nacionalidade);
					}
				});
				$scope.dynamicFields11 = [];
				$scope.dynamicFields22 = [];
				$scope.btnAdd11 = true;
				$scope.btnAdd22 = true;
				$scope.count11 = 0;
				$scope.count22 = 0;


				for (var i = 0; i < $scope.orientadores.length; i++) {
					addOrientadorUpdate();
				}
				for (var i = 0; i < $scope.alunos.length; i++) {
					addAlunoUpdate();
				}
			
			});
		}
		getIntegrantes();

		$scope.emails1 = [];
		$scope.loadEmails1 = function() {
			$scope.emails1 = [];
			return $timeout(function() {
				for (var i = 1; i <= $scope.dynamicFields11.length; i++) {
					if (i === 1 && $scope.projeto3.emailOrientador1 !== undefined) {
						$scope.emails1.push($scope.projeto3.emailOrientador1);
					}
					if (i === 2 && $scope.projeto3.emailOrientador2 !== undefined) {
						$scope.emails1.push($scope.projeto3.emailOrientador2);
					}
				}
				for (var i = 1; i <= $scope.dynamicFields22.length; i++) {
					if (i === 1 && $scope.projeto4.emailAluno1 !== undefined) {
						$scope.emails1.push($scope.projeto4.emailAluno1);
					}
					if (i === 2 && $scope.projeto4.emailAluno2 !== undefined) {
						$scope.emails1.push($scope.projeto4.emailAluno2);
					}
					if (i === 3 && $scope.projeto4.emailAluno3 !== undefined) {
						$scope.emails1.push($scope.projeto4.emailAluno3);
					}
				}
			}, 650);
		};

		$scope.carregaIntegrantes = function() {
			$scope.orientadores = [];
			$scope.alunos = [];
			projetosAPI.getProjeto()
			.success(function(data) {
				angular.forEach(data.integrantes, function (value, key){
					if (value.tipo === 'Orientador') {
						$scope.orientadores.push(value);
					} else if (value.tipo === 'Aluno') {
						$scope.alunos.push(value);
					}
				});
			});
		};

		// $scope.verificaUsername = function(username) {
		// 	for (var i in $scope.conta.usernames) {
		// 		if ($scope.conta.usernames[i] == username) {
		// 			$scope.contaForm.username.$setValidity('duplicado',false);
		// 			break; // importante parar caso username seja igual, senão não funciona
		// 		} else {
		// 			$scope.contaForm.username.$setValidity('duplicado',true);
		// 		}
		// 	}
		// };

		// Funções construtoras dos campos dinâmicos dos integrantes
		// =========================================================================

		$scope.dynamicFields11 = [];
		$scope.dynamicFields22 = [];
		$scope.btnAdd11 = true;
		$scope.btnAdd22 = true;
		$scope.count11 = 0;
		$scope.count22 = 0;

		// Usada tanto pra recarregar um orientador/aluno JÁ EXISTENTE (getIntegrantes
		// já setou a nacionalidade real antes de chamar isso) quanto pra adicionar uma
		// linha NOVA em branco - só entra o padrão brasileiro(a) se ainda não tiver
		// valor nenhum, senão sobrescreveria a nacionalidade de quem já tá cadastrado.
		let addOrientadorUpdate = function() {
			$scope.count11++;
			$scope.projeto3 = $scope.projeto3 || {};
			var campoNacionalidade = 'nacionalidadeOrientador'+$scope.count11;
			$scope.dynamicFields11.push(
				{id:'idOrientador'+$scope.count11, nome:'nomeOrientador'+$scope.count11,
				email:'emailOrientador'+$scope.count11, cpf:'cpfOrientador'+$scope.count11,
				telefone:'telefoneOrientador'+$scope.count11, camiseta:'tamCamisetaOrientador'+$scope.count11,
				nacionalidade:campoNacionalidade}
			);
			if (!$scope.projeto3[campoNacionalidade]) {
				$scope.projeto3[campoNacionalidade] = 'brasileiro';
			}
			if ($scope.count11 === 2) {
				$scope.btnAdd11 = false;
			}
		};
		$scope.addOrientadorUpdate = addOrientadorUpdate;

		let addAlunoUpdate = function() {
			$scope.count22++;
			$scope.projeto4 = $scope.projeto4 || {};
			var campoNacionalidade = 'nacionalidadeAluno'+$scope.count22;
			$scope.dynamicFields22.push(
				{id:'idAluno'+$scope.count22, nome:'nomeAluno'+$scope.count22,
				email:'emailAluno'+$scope.count22, cpf:'cpfAluno'+$scope.count22,
				telefone:'telefoneAluno'+$scope.count22, camiseta:'tamCamisetaAluno'+$scope.count22,
				nacionalidade:campoNacionalidade}
			);
			if (!$scope.projeto4[campoNacionalidade]) {
				$scope.projeto4[campoNacionalidade] = 'brasileiro';
			}
			if ($scope.count22 === 3) {
				$scope.btnAdd22 = false;
			}
		};
		$scope.addAlunoUpdate = addAlunoUpdate;

		// Valida o documento contra QUALQUER nacionalidade suportada, não só a
		// selecionada no form (ver documentoValidatorService). Busca o ngModelController
		// direto no DOM pelo name porque os campos ficam dentro de ng-form aninhado num
		// ng-repeat.
		$scope.validarDocumento = function(valor, fieldName) {
			var checagem = documentoValidatorService.validarDocumento(valor);
			try {
				var els = document.getElementsByName(fieldName);
				if (els && els.length > 0) {
					var ngModelCtrl = angular.element(els[0]).controller('ngModel');
					if (ngModelCtrl && typeof ngModelCtrl.$setValidity === 'function') {
						ngModelCtrl.$setValidity('documento', checagem.valido);
					}
				}
			} catch (e) {}
			return checagem.valido;
		};

		$scope.removeOrientadorUpdate = function(index,idIntegrante) {
			if($scope.projeto3[idIntegrante] !== undefined) {
				let showConfirmDialog = function(ev) {
					var confirm = $mdDialog.confirm()
					.textContent('Deseja excluir o orientador '+(index+1)+' do projeto?')
					.targetEvent(ev)
					.theme('padrao')
					.ok('Sim')
					.cancel('Cancelar');
					$mdDialog.show(confirm).then(function() {
						let id = ({
							integrantes_id: $scope.projeto3[idIntegrante]
						});
						projetosAPI.removeIntegrante(id)
						.success(function(data) {
							$scope.dynamicFields11.splice(index, 1);
							$scope.count11--;
							console.log($scope.count11);
							if ($scope.count11 !== 2) {
								$scope.btnAdd11 = true;
							}
							
							$scope.carregarProjeto();
							getIntegrantes();
							setTimeout($scope.refresh, 750);
							$scope.toast('Alteração realizada com sucesso!','success-toast');
						})
						.error(function(status){
							console.log(status);
							$scope.toast('Falha na alteração','failed-toast');
						});
					});
				};
				showConfirmDialog();
			} else {
				$scope.dynamicFields11.splice(index, 1);
				$scope.projeto3['nomeOrientador'+(index+1)] = "";
				$scope.projeto3['emailOrientador'+(index+1)] = "";
				$scope.projeto3['nacionalidadeOrientador'+(index+1)] = "";
				$scope.projeto3['cpfOrientador'+(index+1)] = "";
				$scope.projeto3['telefoneOrientador'+(index+1)] = "";
				$scope.projeto3['tamCamisetaOrientador'+(index+1)] = "";
				$scope.count11--;
				if ($scope.count11 !== 2) {
					$scope.btnAdd11 = true;
				}
			}
		};

		$scope.removeAlunoUpdate = function(index,idIntegrante) {
			if($scope.projeto4[idIntegrante] !== undefined) {
				let showConfirmDialog = function(ev) {
					var confirm = $mdDialog.confirm()
					.textContent('Deseja excluir o aluno '+(index+1)+' do projeto?')
					.targetEvent(ev)
					.theme('padrao')
					.ok('Sim')
					.cancel('Cancelar');
					$mdDialog.show(confirm).then(function() {
						let id = ({
							integrantes_id: $scope.projeto4[idIntegrante]
						});
						projetosAPI.removeIntegrante(id)
						.success(function(data) {
							$scope.dynamicFields22.splice(index, 1);
							$scope.count22--;
							if ($scope.count22 !== 3) {
								$scope.btnAdd22 = true;
							}

							$scope.projeto5.hospedagem.splice(index, 1);
							let hosp = ({
								hospedagem: $scope.projeto5.hospedagem
							});
							projetosAPI.putProjeto(hosp)
							.success(function(data){
							})
							.error(function(status){
								console.log('update error: '+status);
								$scope.toast('Falha na alteração','failed-toast');
							});

							let showAlert = function(ev) {
								$mdDialog.show(
									$mdDialog.alert()
									.parent(angular.element(document.querySelector('#popupContainer3')))
									.clickOutsideToClose(false)
									.textContent('O(s) aluno(s) alterado(s) foram removidos da lista de hospedagem. Por favor, atualize-a.')
									.ok('OK')
									.targetEvent(ev)
								);/*.then(function(result) {
									location.reload();
								});*/
							};
							showAlert();

							$scope.carregarProjeto();
							getIntegrantes();
							setTimeout($scope.refresh, 750);
							$scope.toast('Alteração realizada com sucesso!','success-toast');
						})
						.error(function(status){
							console.log(status);
							$scope.toast('Falha na alteração','failed-toast');
						});
					});
				};
				showConfirmDialog();
			} else {
				$scope.dynamicFields22.splice(index, 1);
				$scope.projeto4['nomeAluno'+(index+1)] = "";
				$scope.projeto4['emailAluno'+(index+1)] = "";
				$scope.projeto4['nacionalidadeAluno'+(index+1)] = "";
				$scope.projeto4['cpfAluno'+(index+1)] = "";
				$scope.projeto4['telefoneAluno'+(index+1)] = "";
				$scope.projeto4['tamCamisetaAluno'+(index+1)] = "";
				$scope.count22--;
				if ($scope.count22 !== 3) {
					$scope.btnAdd22 = true;
				}
			}
		};
		// =========================================================================

		$scope.refresh = function(){
			console.log("REFRESH");
			$scope.projeto4 = [];
			$scope.projeto3 = [];
			$scope.carregarProjeto();
			getIntegrantes();
		}		

		$scope.alunosArray1 = [];

		$scope.montarIntegrantes1 = function(proj) {
			$scope.alunosArray1 = [];
			for (var i = 1; i <= $scope.dynamicFields22.length; i++) {
				if (i === 1) {
					$scope.alunosArray1.push(proj.nomeAluno1);
				}
				if (i === 2) {
					$scope.alunosArray1.push(proj.nomeAluno2);
				}
				if (i === 3) {
					$scope.alunosArray1.push(proj.nomeAluno3);
				}
			}
		};
	});
})();
