(function(){
	'use strict';

	angular
	.module('PDIAP')
	.controller('avaliadoresCtrl', function($scope, $window, $location, $mdDialog, $stateParams, projetosAPI, documentoValidatorService) {

		$scope.cadastro_avaliadores = true;

		// Fase 2 (ver memória project-mostra-ano-nao-unico): a qual Mostra esta inscrição
		// pertence - mesma lógica de registroCtrl.js (slug na URL, ou a única edição com
		// inscrição de avaliadores aberta; 2+ abertas ao mesmo tempo sem slug mostra uma
		// lista pra escolher, ver avaliadores.html).
		$scope.mostraSlug = $stateParams.slug || null;
		$scope.edicoesParaEscolher = null;
		$scope.carregarEdicoes = function() {
			if ($scope.mostraSlug) return;
			projetosAPI.getEdicoesInscricao().then(function(response) {
				var edicoes = response.data;
				var abertas = (edicoes || []).filter(function(e) { return e.avaliadores && e.avaliadores.aberto && e.slug; });
				if (abertas.length === 1) {
					$scope.mostraSlug = abertas[0].slug;
				} else if (abertas.length > 1) {
					$scope.edicoesParaEscolher = abertas;
				}
			}, function(response) { console.log(response.data); });
		};
		$scope.carregarEdicoes();

		// Valida o documento contra QUALQUER nacionalidade suportada, não só a
		// selecionada no form (ver documentoValidatorService).
		$scope.validarDocumento = function(valor) {
			var checagem = documentoValidatorService.validarDocumento(valor);
			if ($scope.avaliadoresForm && $scope.avaliadoresForm.cpf) {
				$scope.avaliadoresForm.cpf.$setValidity('documento', checagem.valido);
			}
			return checagem.valido;
		};

		// Login único (ver controllers/pessoa-controller.js#vincularPessoa): se documento +
		// e-mail já baterem com uma Pessoa cadastrada, pergunta antes de preencher nome,
		// telefone e nacionalidade automaticamente - a mesma regra de segurança que decide
		// se o cadastro novo reaproveita a Pessoa (CPF sozinho não é suficiente, tem que
		// bater o e-mail também).
		$scope.verificarPessoaExistente = function() {
			var checagem = documentoValidatorService.validarDocumento($scope.avaliadores.cpf);
			if (!checagem.valido || !$scope.avaliadores.email) return;
			projetosAPI.verificarPessoa($scope.avaliadores.cpf, $scope.avaliadores.email)
			.then(function(response) {
				var data = response.data;
				if (!data.encontrado) return;
				var confirm = $mdDialog.confirm()
					.title('Encontramos seu cadastro')
					.textContent('Já existe um cadastro com este documento e e-mail. Preencher automaticamente com os dados salvos (nome, telefone e nacionalidade)?')
					.ariaLabel('Preencher automaticamente com os dados salvos?')
					.ok('Sim, preencher')
					.cancel('Não, manter o que digitei');
				$mdDialog.show(confirm).then(function() {
					$scope.avaliadores.nome = data.nome || $scope.avaliadores.nome;
					$scope.avaliadores.telefone = data.telefone || $scope.avaliadores.telefone;
					$scope.avaliadores.nacionalidade = data.nacionalidade || $scope.avaliadores.nacionalidade;
				}, function() {});
			}, function(response) { console.log(response.data); });
		};

		$scope.carregarEdits = function(){
			projetosAPI.getEdits().then(function(response){
				var edits = response.data;
				if(edits[0].cadastro_avaliadores == false){
					$scope.cadastro_avaliadores = false;
					/*let showConfirmDialog = function(ev) {
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
			}, function(response) {
				console.log(response.data);
			});
		}
		$scope.carregarEdits();

		$scope.avaliadores = $scope.avaliadores || {};
		$scope.avaliadores.categoriasEixos = [];
		$scope.avaliadores.disponibilidade = [];

		projetosAPI.getCategoriasEixos(new Date().getFullYear())
		.then(function(response) {
			$scope.listaCategorias = response.data.categorias;
		}, function(response) {
			console.log(response.data);
		});

		$scope.listaDias = [];
		projetosAPI.getDiasAvaliacao(new Date().getFullYear())
		.then(function(response) {
			$scope.listaDias = response.data.dias;
		}, function(response) {
			console.log(response.data);
		});

		$scope.registrarAvaliador = function(avaliador) {
			let curriculo1 = '';
			if ($scope.lattesVerify === 'Sim') {
				curriculo1 = avaliador.link;
			} else if ($scope.lattesVerify === 'Não') {
				curriculo1 = avaliador.resumoAtividades;
			}
			let pacote = ({
				nome: avaliador.nome,
				email: avaliador.email,
				telefone: avaliador.telefone,
				nacionalidade: avaliador.nacionalidade,
				cpf: avaliador.cpf,
				rg: avaliador.rg,
				dtNascimento: avaliador.dtNascimento,
				nivelAcademico: avaliador.nivelAcademico,
				atuacaoProfissional: avaliador.atuacaoProfissional,
				tempoAtuacao: avaliador.tempoAtuacao,
				categoriasEixos: avaliador.categoriasEixos,
				curriculo: curriculo1,
				disponibilidade: avaliador.disponibilidade,
				createdAt: Date.now(),
				slug: $scope.mostraSlug
			});
			projetosAPI.saveAvaliador(pacote)
			.then(function(response) {
				var data = response.data;
				if (data === 'success') {
					let showConfirmDialog = function(ev) {
						var confirm = $mdDialog.confirm()
						.title('Parabéns!')
						.textContent('Inscrição realizada com sucesso!')
						.ariaLabel('Inscrição realizada com sucesso!')
						.targetEvent(ev)
						.ok('OK, Voltar')
						.cancel('Nova Inscrição');
						$mdDialog.show(confirm).then(function() {
							$window.location.href="http://movaci.com.br";
						}, function() {});
					};
					showConfirmDialog();
					resetForm();
				} else {
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
			}, function(response) {
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
				console.log(response.data);
			});
		};

		let resetForm = function() {
			delete $scope.avaliadores;
			$scope.avaliadores = { categoriasEixos: [], disponibilidade: [] };
			$scope.avaliadoresForm.$setPristine();
			$scope.avaliadoresForm.$setUntouched();
			$scope.lattesVerify = '';
		};
	});
})();
