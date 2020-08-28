(function(){
	'use strict';

	angular
	.module('PDIAPa')
	.controller('editProjetosCtrl', function($scope, $rootScope, $parse, $location, $mdDialog, $mdToast, adminAPI) {


		// $rootScope.header = 'Alterar projeto';
		$rootScope.projetos = [];
		$rootScope.cidades = [];
		$scope.alterado = false;
		$scope.orientadores = [];
		$scope.alunos = [];
		$scope.emails1 = [];
		$scope.palavraChave = [];

		$scope.projeto = {};
		$scope.projeto1 = {};
		$scope.projeto1_2 = {};
		$scope.projeto2 = {};
		$scope.projeto5 = {};
		$scope.projetoEmail = '';
		$scope.integrantes = [];

		$scope.year = CadastraAno();

		$scope.recarregar = function(){
			resetForm();
			
			$rootScope.cidades = [];
			$scope.alterado = false;
			$scope.palavraChave = [];
			$scope.EMAIL = [];
		}

		let resetForm = function() {
			$rootScope.projetos = [];
			$scope.carregarProjetos();

			$scope.orientadores = [];
			$scope.alunos = [];
			$scope.integrantes = [];
			$scope.emails1 = [];

			$scope.projeto = {};
			$scope.projeto1 = {};
			$scope.projeto1_2 = {};
			$scope.projeto2 = {};
			$scope.projeto3 = {};
			$scope.projeto4 = {};
			$scope.projeto5 = {};
			$scope.projetoEmail = '';			

			$scope.dynamicFields11 = [];
			$scope.dynamicFields22 = [];
			$scope.btnAdd11 = true;
			$scope.btnAdd22 = true;
			$scope.count11 = 0;
			$scope.count22 = 0;
		}
	
		$scope.setarProjetos = function() {
			$scope.ordenacao = ['aprovado','participa'];
			$scope.query = 'nomeProjeto';
			$scope.textOrdenacao = [
				{text:'Aprovados',action:['aprovado','participa'],selected:true},
				{text:'Categoria/eixo',action:['categoria','eixo']},
				{text:'Nº de Inscrição',action:'numInscricao'},
				{text:'Nome do projeto',action:'nomeProjeto'},
				{text:'Escola',action:'nomeEscola'}
			];
			$scope.textQuery = [
				{text:'Nome do projeto',action:'nomeProjeto'},
				{text:'Escola',action:'nomeEscola'},
				{text:'Categoria',action:'categoria'},
				{text:'Eixo',action:'eixo'},
				{text:'Orientador',action:'orientadores'}
			];
		}

		$scope.ordenarPor = function(campo) {
			$scope.ordenacao = campo;
		}
		$scope.setBusca = function(campo) {
			$scope.query = campo;
			delete $scope.search;
		}

		let maskCEP = function() {
			$scope.projeto2.cep = $scope.projeto2.cep.substring(0,2) + "." + $scope.projeto2.cep.substring(2);
			$scope.projeto2.cep = $scope.projeto2.cep.substring(0,6) + "-" + $scope.projeto2.cep.substring(6);
		};


		let carregarProjeto = function(projeto) {
								
				$rootScope.selectEixos(projeto.categoria);
				$rootScope.selectCidades(projeto.estado);

				$scope.nomeDoProjeto = projeto.nomeProjeto;				
				$scope.projeto1.nomeProjeto = projeto.nomeProjeto;
				$scope.projeto1.categoria = projeto.categoria;
				$scope.projeto1.eixo = projeto.eixo;
				$scope.projeto1.resumo = projeto.resumo;
				$scope.projeto1._id = projeto._id;
				$scope.projeto1.participa = projeto.participa;
				$scope.projeto1_2.username = projeto.username;
				$scope.projeto1_2.email = projeto.email;
				$scope.projeto1_2._id = projeto._id;
				$scope.EMAILS = [];
				angular.forEach(projeto.integrantes, function (value, key) {
					var Email = value.email;
					$scope.EMAILS.push(Email);	
				});		

				if (projeto.palavraChave === undefined) {
					$scope.palavraChave = [];
				} else {
					$scope.palavraChave = projeto.palavraChave.split(",");
				}

				$scope.projeto2.nomeEscola = projeto.nomeEscola;
				$scope.projeto2.estado = projeto.estado;
				$scope.projeto2.cidade = projeto.cidade;
				$scope.projeto2.cep = projeto.cep;
				$scope.projeto2._id = projeto._id;
				maskCEP();

				$scope.username = projeto.username;
				$scope.projetoEmail = projeto.email;
				

				$scope.projeto5.hospedagem = [];
				$scope.projeto5._id = projeto._id;
				if (projeto.hospedagem !== undefined && projeto.hospedagem !== "") {
					$scope.projeto5.hospedagem = projeto.hospedagem.split(",");
					$scope.hospedagemVerify = 'Sim';
				} else {
					$scope.hospedagemVerify = 'Não';
				}
		};

		$scope.carregarProjetos = function() {
			adminAPI.getTodosProjetos()
			.success(function(projetos) {
				angular.forEach(projetos, function (value, key) {
					var ano = new Date(value.createdAt).getFullYear();
					if(ano == $scope.ano){
						$rootScope.projetos.push(value);
					}	
				});
			})
			.error(function(status) {
				console.log(status);
			});
		};
		$scope.carregarProjetos();
		

		$scope.update = function(projeto) {
			if (projeto.nomeProjeto !== undefined) {
				projeto.palavraChave = $scope.palavraChave;
			}
			adminAPI.putProjeto(projeto)
			.success(function(projeto){
				$scope.alterado = true;
				$scope.toast('Alteração realizada com sucesso!','success-toast');
			})
			.error(function(status){
				console.log('update error: '+status);
				$scope.toast('Falha na alteração','failed-toast');
			});
		};

		$scope.limpaHospedagem = function() {
			$scope.projeto5.hospedagem = [];
		}

		let updateIntegrante = function(pacote) {
			adminAPI.putIntegrante(pacote)
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
						cpf: $scope.projeto3.cpfOrientador1,
						telefone: $scope.projeto3.telefoneOrientador1,
						tamCamiseta: $scope.projeto3.tamCamisetaOrientador1,
						_id: $scope.projeto3.idOrientador1,
						ID: $scope.projeto1._id
					});
					$scope.orientadoresUpdate.push(pacote);
				}
				if (i == 2) {
					var pacote = ({
						tipo: 'Orientador',
						nome: $scope.projeto3.nomeOrientador2,
						email: $scope.projeto3.emailOrientador2,
						cpf: $scope.projeto3.cpfOrientador2,
						telefone: $scope.projeto3.telefoneOrientador2,
						tamCamiseta: $scope.projeto3.tamCamisetaOrientador2,
						_id: $scope.projeto3.idOrientador2,
						ID: $scope.projeto1._id
					});
					$scope.orientadoresUpdate.push(pacote);
				}
			}
			updateIntegrante($scope.orientadoresUpdate);
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
						cpf: $scope.projeto4.cpfAluno1,
						telefone: $scope.projeto4.telefoneAluno1,
						tamCamiseta: $scope.projeto4.tamCamisetaAluno1,
						_id: $scope.projeto4.idAluno1,
						ID: $scope.projeto1._id
					});
					$scope.alunosUpdate.push(pacote);
				}
				if (i == 2) {
					var pacote = ({
						tipo: 'Aluno',
						nome: $scope.projeto4.nomeAluno2,
						email: $scope.projeto4.emailAluno2,
						cpf: $scope.projeto4.cpfAluno2,
						telefone: $scope.projeto4.telefoneAluno2,
						tamCamiseta: $scope.projeto4.tamCamisetaAluno2,
						_id: $scope.projeto4.idAluno2,
						ID: $scope.projeto1._id
					});
					$scope.alunosUpdate.push(pacote);
				}
				if (i == 3) {
					var pacote = ({
						tipo: 'Aluno',
						nome: $scope.projeto4.nomeAluno3,
						email: $scope.projeto4.emailAluno3,
						cpf: $scope.projeto4.cpfAluno3,
						telefone: $scope.projeto4.telefoneAluno3,
						tamCamiseta: $scope.projeto4.tamCamisetaAluno3,
						_id: $scope.projeto4.idAluno3,
						ID: $scope.projeto1._id
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
			adminAPI.putProjeto(hosp)
			.success(function(data){
			})
			.error(function(status){
				console.log('update error: '+status);
				$scope.toast('Falha na alteração','failed-toast');
			});

			updateIntegrante($scope.alunosUpdate);

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

		$scope.preencherCampos = function(data) {
			resetForm();
			$scope.projeto = data;
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
					var model0 = $parse(str0);
					var model1 = $parse(str1);
					var model2 = $parse(str2);
					var model3 = $parse(str3);
					var model4 = $parse(str4);
					var model5 = $parse(str5);

					value.cpf = value.cpf.substring(0,3) + "." + value.cpf.substring(3);
					value.cpf = value.cpf.substring(0,7) + "." + value.cpf.substring(7);
					value.cpf = value.cpf.substring(0,11) + "-" + value.cpf.substring(11);

					value.telefone = "(" + value.telefone.substring(0);
					value.telefone = value.telefone.substring(0,3) + ")" + value.telefone.substring(3);
					value.telefone = value.telefone.substring(0,4) + " " + value.telefone.substring(4);
					value.telefone = value.telefone.substring(0,9) + "-" + value.telefone.substring(9);
					model0.assign($scope, value._id);
					model1.assign($scope, value.nome);
					model2.assign($scope, value.email);
					model3.assign($scope, value.cpf);
					model4.assign($scope, value.telefone);
					model5.assign($scope, value.tamCamiseta);
				} else if (value.tipo === 'Aluno') {
					$scope.alunos.push(value);
					y++;
					var str0 = 'projeto4.idAluno'+y;
					var str1 = 'projeto4.nomeAluno'+y;
					var str2 = 'projeto4.emailAluno'+y;
					var str3 = 'projeto4.cpfAluno'+y;
					var str4 = 'projeto4.telefoneAluno'+y;
					var str5 = 'projeto4.tamCamisetaAluno'+y;
					var model0 = $parse(str0);
					var model1 = $parse(str1);
					var model2 = $parse(str2);
					var model3 = $parse(str3);
					var model4 = $parse(str4);
					var model5 = $parse(str5);

					value.cpf = value.cpf.substring(0,3) + "." + value.cpf.substring(3);
					value.cpf = value.cpf.substring(0,7) + "." + value.cpf.substring(7);
					value.cpf = value.cpf.substring(0,11) + "-" + value.cpf.substring(11);

					value.telefone = "(" + value.telefone.substring(0);
					value.telefone = value.telefone.substring(0,3) + ")" + value.telefone.substring(3);
					value.telefone = value.telefone.substring(0,4) + " " + value.telefone.substring(4);
					value.telefone = value.telefone.substring(0,9) + "-" + value.telefone.substring(9);

					model0.assign($scope, value._id);
					model1.assign($scope, value.nome);
					model2.assign($scope, value.email);
					model3.assign($scope, value.cpf);
					model4.assign($scope, value.telefone);
					model5.assign($scope, value.tamCamiseta);
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
			carregarProjeto($scope.projeto);							
		}
		

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

		$scope.carregaIntegrantes = function(projeto) {
			$scope.orientadores = [];
			$scope.alunos = [];
			angular.forEach(projeto.integrantes, function (value, key){
				if (value.tipo === 'Orientador') {
					$scope.orientadores.push(value);
				} else if (value.tipo === 'Aluno') {
					$scope.alunos.push(value);
				}
			});
		};

		$scope.dynamicFields11 = [];
		$scope.dynamicFields22 = [];
		$scope.btnAdd11 = true;
		$scope.btnAdd22 = true;
		$scope.count11 = 0;
		$scope.count22 = 0;

		let addOrientadorUpdate = function() {
			$scope.count11++;
			$scope.dynamicFields11.push(
				{id:'idOrientador'+$scope.count11, nome:'nomeOrientador'+$scope.count11,
				email:'emailOrientador'+$scope.count11, cpf:'cpfOrientador'+$scope.count11,
				telefone:'telefoneOrientador'+$scope.count11, camiseta:'tamCamisetaOrientador'+$scope.count11}
			);
			if ($scope.count11 === 2) {
				$scope.btnAdd11 = false;
			}
		};
		$scope.addOrientadorUpdate = addOrientadorUpdate;

		let addAlunoUpdate = function() {
			$scope.count22++;
			$scope.dynamicFields22.push(
				{id:'idAluno'+$scope.count22, nome:'nomeAluno'+$scope.count22,
				email:'emailAluno'+$scope.count22, cpf:'cpfAluno'+$scope.count22,
				telefone:'telefoneAluno'+$scope.count22, camiseta:'tamCamisetaAluno'+$scope.count22}
			);
			if ($scope.count22 === 3) {
				$scope.btnAdd22 = false;
			}
		};
		$scope.addAlunoUpdate = addAlunoUpdate;

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
							integrantes_id: $scope.projeto3[idIntegrante],
							ID: $scope.projeto1._id
						});
						adminAPI.removeIntegrante(id)
						.success(function(data) {
							$scope.dynamicFields11.splice(index, 1);
							$scope.count11--;
							console.log($scope.count11);
							if ($scope.count11 !== 2) {
								$scope.btnAdd11 = true;
							}
							
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
							integrantes_id: $scope.projeto4[idIntegrante],
							ID: $scope.projeto1._id
							
						});
						adminAPI.removeIntegrante(id)
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
							adminAPI.putProjeto(hosp)
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

		$scope.removeProjeto = function(ev,id,nomeProjeto) {
			var confirm = $mdDialog.confirm()
			.textContent('Deseja remover o projeto '+nomeProjeto+'?')
			.ariaLabel('Remover projeto')
			.targetEvent(ev)
			.ok('Sim')
			.cancel('Não');
			$mdDialog.show(confirm).then(function() {
				adminAPI.putRemoveProjeto(id)
				.success(function(data) {
					$scope.toast('Projeto removido com sucesso!','success-toast');
					var index = $scope.projetos.map(function(e) { return e._id; }).indexOf(id);
					if (index !== -1) {
						$scope.projetos.splice(index, 1);
					}
				})
				.error(function(status) {
					$scope.toast('Falha.','failed-toast');
					console.log("Error: "+status);
				});
			}, function() {});
		};

		
		$scope.setarProjetos();
		
	});
})();
