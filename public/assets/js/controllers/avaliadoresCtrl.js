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
			projetosAPI.getEdicoesInscricao().success(function(edicoes) {
				var abertas = (edicoes || []).filter(function(e) { return e.avaliadores && e.avaliadores.aberto && e.slug; });
				if (abertas.length === 1) {
					$scope.mostraSlug = abertas[0].slug;
				} else if (abertas.length > 1) {
					$scope.edicoesParaEscolher = abertas;
				}
			})
			.error(function(status) { console.log(status); });
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

		$scope.carregarEdits = function(){
			projetosAPI.getEdits().success(function(edits){				
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
			})
			.error(function(status) {
				console.log(status);
			});
		}
		$scope.carregarEdits();		

		$scope.avaliadores = $scope.avaliadores || {};
		$scope.avaliadores.categoriasEixos = [];
		$scope.avaliadores.disponibilidade = [];

		projetosAPI.getCategoriasEixos(new Date().getFullYear())
		.success(function(data) {
			$scope.listaCategorias = data.categorias;
		})
		.error(function(status) {
			console.log(status);
		});

		$scope.listaDias = [];
		projetosAPI.getDiasAvaliacao(new Date().getFullYear())
		.success(function(data) {
			$scope.listaDias = data.dias;
		})
		.error(function(status) {
			console.log(status);
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
			.success(function(data, status) {
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
			})
			.error(function(status) {
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
				console.log(status);
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
