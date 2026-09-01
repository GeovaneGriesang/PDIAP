(function(){
	'use strict';

	angular
	.module('PDIAP')
	.controller('registroCtrl', function($scope, $rootScope, $mdDialog, $mdConstant, $q, $window, $location, $timeout, projetosAPI, documentoValidatorService) {
	
		// Estado geral da tela de inscrição.
		$scope.cadastro_projetos = true;

		// Vídeo tutorial "como se inscrever": fica escondido por padrão e expande/recolhe na
		// própria página ao clicar no botão (mesmo padrão de "+/-" já usado em outras telas),
		// em vez de abrir num diálogo à parte - o diálogo (md-dialog) tinha limite de altura
		// próprio que cortava o vídeo, já que ele é vertical (gravação de celular, 882x1920).
		$scope.videoTutorialAberto = false;
		$scope.alternarVideoTutorial = function() {
			$scope.videoTutorialAberto = !$scope.videoTutorialAberto;
		};

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
		$scope.hospedagemVerify = 'Não';
		$scope.eixos = [];
		$scope.cidades = [];
		$scope.usernames = [];
		$scope.escolas = [];

		// Envia o projeto ao backend e trata a resposta de sucesso ou erro.
		$scope.registrarProjeto = function(projeto) {
			projeto.palavraChave = $scope.palavrasChave;
			projetosAPI.saveProjeto(projeto)
			.success(function(data, status) {
				if (status === 202) {
					$scope.usernameDuplicado = true;
					$scope.projetoForm.username.$setValidity('duplicado',false);
					// console.log('user duplicado: '+$scope.usernameDuplicado);
				} else if (data && data.redirect) {
					$scope.registro = true;
					// O backend já autenticou o projeto recém-criado nesta sessão, então
					// o redirect (normalmente /projetos) já cai na página logada.
					let showConfirmDialog = function(ev) {
						var confirm = $mdDialog.alert()
						.title('Parabéns!')
						.textContent('Inscrição realizada com sucesso! Você será direcionado à página do seu projeto.')
						.ariaLabel('Inscrição realizada com sucesso!')
						.targetEvent(ev)
						.ok('OK');
						$mdDialog.show(confirm).then(function() {
							$window.location.href = data.redirect;
						});
					};
					showConfirmDialog();
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
				// "status" aqui é o corpo da resposta (peculiaridade do .error() do
				// AngularJS) - quando o servidor manda um motivo específico (ex:
				// "Telefone inválido."), mostra ele; só cai no texto genérico se vier
				// vazio ou for o "error" cru sem detalhe nenhum.
				var motivo = (status && status !== 'error') ? status : null;
				let showConfirmDialog = function(ev) {
					var confirm = $mdDialog.confirm()
					.title('Ops...')
					.textContent(motivo ? ('Não foi possível concluir: ' + motivo + ' Corrija e tente novamente.') : 'A inscrição não foi realizada. Tente novamente ou então, entre em contato conosco.')
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

		// Antes, essa checagem só olhava um subconjunto fixo de campos (dados gerais
		// do projeto) e deixava passar mesmo com orientador(es)/aluno(s) inválidos ou
		// em branco - a pessoa só descobria isso muito mais tarde, com o botão
		// "Finalizar" desabilitado sem nenhuma pista do motivo (bem depois de já ter
		// preenchido login e senha). Agora usa a validade do formulário inteiro
		// (projetoForm.$valid), que já cobre exatamente os campos visíveis nesse
		// momento da tela (a seção de login só entra no DOM depois de "Avançar", via
		// ng-if, então nem participa da validação ainda).
		$scope.canAdvanceToLogin = function() {
			return !!$scope.cadastro_projetos && !!$scope.projetoForm && $scope.projetoForm.$valid;
		};

		// Rótulos amigáveis pra cada campo do formulário, usados na lista de
		// pendências (ver listarPendencias). Campos "estáticos" ficam no mapa; campos
		// dinâmicos de orientador/aluno (nomeOrientador2, emailAluno3 etc.) são
		// reconhecidos por padrão de nome, então não precisam de uma entrada por
		// índice.
		var CAMPO_LABELS = {
			nomeProjeto: 'Nome do projeto',
			palavrasChaveTexto: 'Palavras-chave',
			categoria: 'Categoria',
			eixo: 'Eixo temático',
			nomeEscola: 'Nome da instituição',
			estado: 'Estado',
			cidade: 'Cidade',
			cep: 'CEP',
			hospedagemVerify: 'Se algum integrante precisa de hospedagem (Sim/Não)',
			hospedagem: 'Quais integrantes precisam de hospedagem',
			email: 'E-mail principal do login',
			username: 'Nome de usuário do login',
			password: 'Senha',
			password2: 'Confirmação de senha'
		};

		var CAMPO_DINAMICO_LABELS = { nome: 'nome completo', email: 'e-mail', cpf: 'documento de identificação', telefone: 'telefone', tamCamiseta: 'tamanho da camiseta' };

		function labelDoCampo(nome) {
			if (CAMPO_LABELS[nome]) return CAMPO_LABELS[nome];
			var m = nome.match(/^(nome|email|cpf|telefone|tamCamiseta)(Orientador|Aluno)(\d+)$/);
			if (m) {
				var papel = m[2] === 'Orientador' ? 'Orientador(a)' : 'Aluno(a)';
				return 'O ' + CAMPO_DINAMICO_LABELS[m[1]] + ' do(a) ' + papel + ' ' + m[3];
			}
			return nome;
		}

		var MOTIVO_ERRO = {
			required: 'não foi preenchido(a)',
			pattern: 'está com formato inválido',
			minlength: 'está muito curto(a)',
			duplicado: 'já está sendo utilizado por outro projeto',
			documento: 'não é um documento válido',
			passwordVerify: 'não confere com a senha digitada'
		};

		// Varre o $error do form (validador -> lista de controles) e monta uma frase
		// por campo com problema, sem repetir o mesmo campo mais de uma vez mesmo que
		// ele tenha mais de um erro simultâneo.
		function listarPendencias($error) {
			var vistos = {};
			var lista = [];
			angular.forEach($error, function(controles, tipoErro) {
				angular.forEach(controles, function(ctrl) {
					var nome = ctrl.$name;
					if (!nome || vistos[nome]) return;
					vistos[nome] = true;
					lista.push(labelDoCampo(nome) + ' ' + (MOTIVO_ERRO[tipoErro] || 'está inválido') + '.');
				});
			});
			return lista;
		}

		// Lista do que falta pra liberar "Avançar" - nesse momento o form só contém
		// (no DOM) os campos da seção de dados do projeto, então já é exatamente o
		// conjunto certo.
		$scope.pendenciasAvancar = function() {
			if (!$scope.projetoForm) return [];
			return listarPendencias($scope.projetoForm.$error);
		};

		// Lista do que falta pra liberar "Finalizar" - depois de "Avançar" a seção de
		// login entra no DOM e passa a fazer parte do mesmo form, então a mesma
		// varredura já cobre tudo. O aceite do regulamento é conferido à parte porque
		// não é um controle nomeado do form (checkbox sem "name").
		$scope.pendenciasFinalizar = function() {
			if (!$scope.projetoForm) return [];
			var lista = listarPendencias($scope.projetoForm.$error);
			if (!$scope.aceitaRegulamento) {
				lista.push('Você precisa aceitar os termos do regulamento da feira.');
			}
			return lista;
		};

		$scope.keys = [$mdConstant.KEY_CODE.ENTER, $mdConstant.KEY_CODE.COMMA];
		$scope.palavrasChave = [];

		// A grande maioria das dúvidas de quem se inscreve travava aqui: o campo de
		// chips exigia apertar Enter (ou vírgula) depois de CADA palavra-chave pra
		// "confirmar" ela, e sem isso o botão Avançar nunca liberava. Agora a pessoa só
		// digita as palavras separadas por vírgula ou ponto e vírgula, sem precisar
		// confirmar nada - a lista é reconhecida em tempo real. Muta o array em vez de
		// reatribuir (`$scope.palavrasChave = ...`) pra não quebrar em telas onde esse
		// array é herdado de um escopo pai via prototype chain (ver update.html).
		$scope.palavrasChaveTexto = '';
		$scope.atualizarPalavrasChave = function(texto) {
			var partes = (texto || '').split(/[,;]+/)
				.map(function(p) { return p.trim(); })
				.filter(function(p) { return p.length > 0; });
			$scope.palavrasChave.length = 0;
			partes.forEach(function(p) { $scope.palavrasChave.push(p); });
		};

		$scope.checkValidate = function(palavra) {
			if (palavra.length === 5) {
				$scope.palavrasChave.splice(6, 1);
				$scope.msg = 'aaa';
			}
		}

		$scope.emails = [];
		// Carrega e organiza os e-mails sugeridos para o login principal.
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

		// Atualiza a lista de eixos conforme a categoria selecionada.
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

		// Nacionalidade vem pré-marcada como brasileiro(a) - é a esmagadora maioria
		// dos casos, e quem não for só troca o select. $scope.projeto não existe até
		// alguém digitar algo (esta tela não tem um controller pai que já crie o
		// objeto, ao contrário do dashboard do projeto), então precisa criar aqui pra
		// esse valor inicial aparecer pré-selecionado.
		$scope.projeto = $scope.projeto || {};
		$scope.projeto.nacionalidadeOrientador1 = 'brasileiro';
		$scope.projeto.nacionalidadeAluno1 = 'brasileiro';

		$scope.btnAdd1 = true;
		$scope.btnAdd2 = true;
		$scope.count1 = 1;
		$scope.count2 = 1;

		$scope.addOrientador = function() {
			$scope.count1++;
			$scope.dynamicFields1.push(
				{nome:'nomeOrientador'+$scope.count1, email:'emailOrientador'+$scope.count1, cpf:'cpfOrientador'+$scope.count1, telefone:'telefoneOrientador'+$scope.count1, camiseta:'tamCamisetaOrientador'+$scope.count1, nacionalidade:'nacionalidadeOrientador'+$scope.count1}
			);
			$scope.projeto['nacionalidadeOrientador'+$scope.count1] = 'brasileiro';
			if ($scope.count1 === 2) {
				$scope.btnAdd1 = false;
			}
		};
		$scope.addAluno = function() {
			$scope.count2++;
			$scope.dynamicFields2.push(
				{nome:'nomeAluno'+$scope.count2, email:'emailAluno'+$scope.count2, cpf:'cpfAluno'+$scope.count2, telefone:'telefoneAluno'+$scope.count2, camiseta:'tamCamisetaAluno'+$scope.count2, nacionalidade:'nacionalidadeAluno'+$scope.count2}
			);
			$scope.projeto['nacionalidadeAluno'+$scope.count2] = 'brasileiro';
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

		// getUsersEscolas() só serve pra checagem de username duplicado aqui agora - a
		// lista de escolas (pra seleção) vem da coleção Escola (getEscolas, abaixo).
		projetosAPI.getUsersEscolas()
		.success(function(data) {
			angular.forEach(data, function (value) {
				if (value.username !== undefined) {
					$scope.usernames.push(value.username);
				}
			});
		});

		// Lista de escolas aprovadas, pra seleção no cadastro de projeto (antes era
		// texto livre com sugestão - agora só dá pra escolher da lista, ver
		// md-require-match em inscricao.html).
		projetosAPI.getEscolas()
		.success(function(data) {
			$scope.escolas = data;
		})
		.error(function(status) {
			console.log('Erro ao carregar escolas: '+status);
		});

		// Escola não encontrada na lista: abre um diálogo pedindo os mesmos dados do
		// cadastro de projeto (nome/cep/cidade/estado) e envia como solicitação
		// pendente. A inscrição do projeto segue normalmente usando essa escola
		// pendente - não trava esperando o admin aprovar, só o texto que aparece pro
		// selecionador muda de "digite" pra essa escola já vinculada.
		$scope.escolaNaoEncontrada = function(nomeDigitado, ev) {
			$mdDialog.show({
				controller: function dialogController($scope, $mdDialog, projetosAPI) {
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
					projetosAPI.getEstados().success(function(data) {
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
				projetosAPI.solicitarEscola(escolaSolicitada)
				.success(function(escolaCriada) {
					$scope.escolas.push(escolaCriada);
					$scope.projeto.nomeEscola = escolaCriada.nome;
					preencherEnderecoDaEscola($scope.projeto, escolaCriada);
					atualizarValidadeEscola($scope.projeto, $scope.projetoForm);
				})
				.error(function(status) {
					console.log('Erro ao solicitar escola: '+status);
				});
			}, function() {});
		};

		// Selecionou uma escola da lista (ou limpou a seleção, item undefined): guarda o
		// _id (é o que vai pro backend) e aproveita pra pré-preencher estado/cidade -
		// menos campo repetido pra digitar, já que a escola já tem esse dado salvo.
		//
		// Genérico (alvo/formulario como parâmetro) porque essa mesma seleção de escola
		// vale tanto pra inscrição nova (projeto/projetoForm, inscricao.html) quanto pra
		// edição (projeto2/projetoForm2, update.html e editar-projetos.html do admin) -
		// os wrappers *Instituicao abaixo fixam o alvo certo pra cada caso.
		function preencherEnderecoDaEscola(alvo, escola) {
			alvo.escola = escola._id;
			if (escola.estado) {
				alvo.estado = escola.estado;
				$scope.selectCidades(escola.estado);
			}
			if (escola.cidade) alvo.cidade = escola.cidade;
			if (escola.cep) alvo.cep = escola.cep;
		}

		// md-autocomplete não trava a digitação em texto livre (ao contrário de um
		// select) - então dá pra digitar algo, selecionar da lista, e depois continuar
		// digitando e apagar a seleção sem querer. Essa validação customizada garante
		// que só fica válido com um _id de escola de verdade vinculado (selecionada da
		// lista ou solicitada como pendente), nunca só com texto livre.
		function atualizarValidadeEscola(alvo, formulario) {
			var valido = !alvo.nomeEscola || !!alvo.escola;
			formulario.nomeEscola.$setValidity('escolaSelecionada', valido);
		}

		$scope.escolaSelecionada = function(item) {
			$scope.projeto.escola = item ? item._id : undefined;
			if (item) preencherEnderecoDaEscola($scope.projeto, item);
			atualizarValidadeEscola($scope.projeto, $scope.projetoForm);
		};

		$scope.escolaTextoAlterado = function() {
			if ($scope.projeto.escola) {
				var atual = $scope.escolas.filter(function(e) { return e._id === $scope.projeto.escola; })[0];
				if (!atual || atual.nome !== $scope.projeto.nomeEscola) {
					$scope.projeto.escola = undefined;
				}
			}
			atualizarValidadeEscola($scope.projeto, $scope.projetoForm);
		};

		// Mesma coisa, pra edição de um projeto já existente (aba "Instituição" de
		// update.html e de editar-projetos.html no admin) - usa projeto2/projetoForm2
		// em vez de projeto/projetoForm.
		$scope.escolaSelecionadaInstituicao = function(item) {
			$scope.projeto2.escola = item ? item._id : undefined;
			if (item) preencherEnderecoDaEscola($scope.projeto2, item);
			atualizarValidadeEscola($scope.projeto2, $scope.projetoForm2);
		};

		$scope.escolaTextoAlteradoInstituicao = function() {
			if ($scope.projeto2.escola) {
				var atual = $scope.escolas.filter(function(e) { return e._id === $scope.projeto2.escola; })[0];
				if (!atual || atual.nome !== $scope.projeto2.nomeEscola) {
					$scope.projeto2.escola = undefined;
				}
			}
			atualizarValidadeEscola($scope.projeto2, $scope.projetoForm2);
		};

		$scope.escolaNaoEncontradaInstituicao = function(nomeDigitado, ev) {
			$mdDialog.show({
				controller: function dialogController($scope, $mdDialog, projetosAPI) {
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
					projetosAPI.getEstados().success(function(data) {
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
				projetosAPI.solicitarEscola(escolaSolicitada)
				.success(function(escolaCriada) {
					$scope.escolas.push(escolaCriada);
					$scope.projeto2.nomeEscola = escolaCriada.nome;
					preencherEnderecoDaEscola($scope.projeto2, escolaCriada);
					atualizarValidadeEscola($scope.projeto2, $scope.projetoForm2);
				})
				.error(function(status) {
					console.log('Erro ao solicitar escola: '+status);
				});
			}, function() {});
		};

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
      

		// Marca os campos de documento como válidos ou inválidos, aceitando o valor se
		// bater com QUALQUER nacionalidade suportada (não só a selecionada no form).
		$scope.validarDocumento = function(valor, index, tipo) {
			var fieldName = '';
			if (tipo === 'orientador') {
				fieldName = 'cpfOrientador' + (index + 1);
			} else {
				fieldName = 'cpfAluno' + (index + 1);
			}
			var valido = documentoValidatorService.validarDocumento(valor).valido;

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
			$scope.projeto = { nacionalidadeOrientador1: 'brasileiro', nacionalidadeAluno1: 'brasileiro' };
			$scope.palavrasChave = [];
			$scope.palavrasChaveTexto = '';
			$scope.eixos = [];
			$scope.cidades = [];
			$scope.loginHabilitado = false;
			$scope.emailDuplicado = false;
		};

	});
})();
