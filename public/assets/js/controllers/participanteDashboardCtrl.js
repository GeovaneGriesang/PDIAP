(function(){
	'use strict';

	angular
	.module('PDIAP')
	.controller('participanteDashboardCtrl', function($scope, $rootScope, $state, $window, $http, $mdToast, participanteAPI, contaAPI, certificadosService) {

		$scope.participante = $rootScope.participanteLogado || {};

		// Login único: esta mesma Pessoa também pode ser Avaliador(a) (ver
		// routes/index.js#/dashboard/trocar-papel) - troca sem pedir senha de novo.
		$scope.trocarPainel = function() {
			contaAPI.trocarPapel()
			.then(function() {
				$state.go('avaliadorDashboard');
			}, function(response) {
				console.log('Error: ' + response.data);
			});
		};

		// Se por algum motivo chegou aqui sem ter definido senha ainda (ex: voltou pelo
		// histórico do navegador), manda pra tela obrigatória em vez de mostrar o dashboard.
		if (!$scope.participante.senhaDefinida) {
			$window.location.href = '/participantes/dashboard/trocar-senha';
			return;
		}

		// Certificados: abre o mesmo diálogo da página pública de certificados, já com o documento
		// de quem está logado - lista TODOS os certificados da pessoa (todas as edições da MOVACI e
		// todos os papéis: avaliador(a), orientador(a), estudante, participante, responsável...),
		// não só os do papel deste painel (ver services/certificadosService.js).
		$scope.buscandoCertificados = false;
		$scope.verCertificados = function() {
			$scope.buscandoCertificados = true;
			contaAPI.getMeusDados()
			.then(function(response) {
				if (!response.data.documento) {
					$scope.toast('Seu cadastro está sem documento de identificação. Fale com a organização.', 'failed-toast');
					return;
				}
				certificadosService.buscarPorDocumento(response.data.documento);
			}, function(response) {
				$scope.toast('Não foi possível carregar seus certificados.', 'failed-toast');
			})
			.finally(function() {
				$scope.buscandoCertificados = false;
			});
		};

		$scope.toast = function(message, tema) {
			var toast = $mdToast.simple().textContent(message).action('✖').position('top right').theme(tema).hideDelay(6000);
			$mdToast.show(toast);
		};

		$scope.logout = function() {
			$http.post('/logout').then(function() {
				$window.location.href = '/';
			});
		};
	});
})();
