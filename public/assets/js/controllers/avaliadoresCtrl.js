(function(){
	'use strict';

	angular
	.module('PDIAP')
	.controller('avaliadoresCtrl', function($scope, $window, $location, $mdDialog, projetosAPI, documentoValidatorService) {

		$scope.cadastro_avaliadores = true;

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

		projetosAPI.getCategorias()
		.success(function(data) {
			$scope.listaCategorias = data.categorias;
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
				turnos: avaliador.turnos,
				createdAt: Date.now()
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
			$scope.avaliadores = { categoriasEixos: [] };
			$scope.avaliadoresForm.$setPristine();
			$scope.avaliadoresForm.$setUntouched();
			$scope.avaliadoresForm.turnos.$setUntouched();
			$scope.lattesVerify = '';
		};
	});
})();
