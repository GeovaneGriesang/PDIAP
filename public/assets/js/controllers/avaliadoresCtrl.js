(function(){
	'use strict';

	angular
	.module('PDIAP')
	.controller('avaliadoresCtrl', function($scope, $window, $location, $mdDialog, projetosAPI) {

		$scope.cadastro_avaliadores = true;

		function _validateCPF(cpf) {
			cpf = (cpf || '').replace(/\D+/g, '');
			if (cpf.length !== 11 || /^([0-9])\1+$/.test(cpf)) return false;
			var sum = 0, rest;
			for (var i = 1; i <= 9; i++) sum += parseInt(cpf.substring(i-1, i)) * (11 - i);
			rest = (sum * 10) % 11; if (rest === 10 || rest === 11) rest = 0;
			if (rest !== parseInt(cpf.substring(9, 10))) return false;
			sum = 0;
			for (i = 1; i <= 10; i++) sum += parseInt(cpf.substring(i-1, i)) * (12 - i);
			rest = (sum * 10) % 11; if (rest === 10 || rest === 11) rest = 0;
			if (rest !== parseInt(cpf.substring(10, 11))) return false;
			return true;
		}

		$scope.validarDocumento = function(valor, nacionalidade) {
			var digits = (valor || '').toString().replace(/\D+/g, '');
			var valido = (nacionalidade === 'brasileiro') ? _validateCPF(digits) : digits.length >= 5;
			if ($scope.avaliadoresForm && $scope.avaliadoresForm.cpf) {
				$scope.avaliadoresForm.cpf.$setValidity('documento', valido);
			}
			return valido;
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

		$scope.eixos = [];

		projetosAPI.getCategorias()
		.success(function(data) {
			$scope.listaCategorias = data.categorias;
		})
		.error(function(status) {
			console.log(status);
		});

		$scope.selectEixos = function(cat) {
			angular.forEach($scope.listaCategorias, function (value, key){
				//verifica a categoria selecionada
				if(cat === value.categoria){
					$scope.eixos = [];
					//adiciona os eixos em $scope.eixos
					for (var i in value.eixos) {
						$scope.eixos.push(value.eixos[i]);
					}
				}
			});
		};

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
				categoria: avaliador.categoria,
				eixo: avaliador.eixo,
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
			$scope.avaliadoresForm.$setPristine();
			$scope.avaliadoresForm.$setUntouched();
			$scope.avaliadoresForm.turnos.$setUntouched();
			$scope.lattesVerify = '';
		};
	});
})();
