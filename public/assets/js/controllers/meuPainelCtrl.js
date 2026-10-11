(function(){
	'use strict';

	// "Meu painel": um painel só pra qualquer pessoa logada (avaliador(a), participante...), com
	// tudo num lugar - participações em cada Mostra (derivadas dos vínculos, ver
	// routes/index.js#/conta/meus-dados) e todos os certificados. Substitui os dois painéis
	// separados que existiam antes (avaliador e participante). As URLs antigas
	// (/avaliadores/dashboard e /participantes/dashboard) continuam abrindo esta tela - o login
	// ainda entra por um dos dois papéis (ver utils/loginBootstrap.js#autenticarPapel), e é esse
	// papel que define as rotas de "Meus dados" e "Trocar minha senha".
	angular
	.module('PDIAP')
	//
	// Menu lateral (meu-painel.html): "Início" (resumo) e uma entrada por Mostra - a Mostra
	// escolhida mostra as participações dela e os certificados do mesmo ano.
	.controller('meuPainelCtrl', function($scope, $rootScope, $state, $window, $http, $mdToast, $mdSidenav, $mdMedia, contaAPI, certificadosService) {

		var ehAvaliador = $state.current.name === 'avaliadorDashboard';
		var logado = (ehAvaliador ? $rootScope.avaliadorLogado : $rootScope.participanteLogado) || {};

		// Se por algum motivo chegou aqui sem ter definido senha ainda (ex: voltou pelo
		// histórico do navegador), manda pra tela obrigatória em vez de mostrar o painel.
		if (!logado.senhaDefinida) {
			$window.location.href = ehAvaliador ? '/avaliadores/dashboard/trocar-senha' : '/participantes/dashboard/trocar-senha';
			return;
		}

		$scope.nome = logado.nome;
		$scope.estadoDados = ehAvaliador ? 'avaliadorDados' : 'participanteDados';
		$scope.estadoTrocarSenha = ehAvaliador ? 'avaliadorTrocarSenha' : 'participanteTrocarSenha';
		$scope.conta = null;

		$scope.toast = function(message, tema) {
			$mdToast.show($mdToast.simple().textContent(message).action('✖').position('top right').theme(tema).hideDelay(6000));
		};

		$scope.selecionada = null; // Mostra aberta no conteúdo; null = Início
		$scope.secaoMostras = true;
		$scope.certificados = null; // lista de certificadosService.listarCertificados
		$scope.erroCertificados = false;

		$scope.selecionar = function(mostra) {
			$scope.selecionada = mostra;
			if (!$mdMedia('gt-sm')) $mdSidenav('menuPainel').close();
		};
		$scope.abrirMenu = function() {
			$mdSidenav('menuPainel').open();
		};

		// Certificado não guarda a Mostra, só o ano (ver routes/index.js#/emitirCertificado),
		// então a ligação com a Mostra é pelo ano. Se houver duas Mostras no mesmo ano, os
		// certificados daquele ano aparecem nas duas.
		$scope.certificadosDaMostra = function(mostra) {
			return ($scope.certificados || []).filter(function(c) { return mostra.ano && c.ano === mostra.ano; });
		};
		$scope.certificadosAvulsos = function() {
			var anos = (($scope.conta && $scope.conta.mostras) || []).map(function(m) { return m.ano; });
			return ($scope.certificados || []).filter(function(c) { return anos.indexOf(c.ano) === -1; });
		};
		$scope.baixar = function(certificado) {
			if (!certificado.baixar()) {
				$scope.toast('O certificado deste ano ainda não está disponível. Fale com a organização da MOVACI.', 'failed-toast');
			}
		};

		contaAPI.getMeusDados()
		.then(function(response) {
			$scope.conta = response.data;
			if ($scope.conta.nome) $scope.nome = $scope.conta.nome;
			if (!$scope.conta.documento) {
				$scope.certificados = [];
				return;
			}
			certificadosService.listarCertificados($scope.conta.documento)
			.then(function(itens) {
				$scope.certificados = itens;
			}, function() {
				$scope.erroCertificados = true;
			});
		}, function() {
			$scope.toast('Não foi possível carregar suas participações.', 'failed-toast');
		});

		// Abre o mesmo diálogo da página pública de certificados, com o documento de quem está
		// logado - TODOS os certificados da pessoa (ver services/certificadosService.js).
		$scope.buscandoCertificados = false;
		$scope.verCertificados = function() {
			var documento = $scope.conta && $scope.conta.documento;
			if (!documento) {
				$scope.toast('Seu cadastro está sem documento de identificação. Fale com a organização.', 'failed-toast');
				return;
			}
			certificadosService.buscarPorDocumento(documento);
		};

		$scope.logout = function() {
			$http.post('/logout').then(function() {
				$window.location.href = '/';
			});
		};
	});
})();
