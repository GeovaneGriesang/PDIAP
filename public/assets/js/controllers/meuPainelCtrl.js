(function(){
	'use strict';

	// "Meu painel": o painel único de qualquer pessoa logada (estudante, orientador(a),
	// avaliador(a), participante...), com tudo num lugar - participações em cada Mostra
	// (derivadas dos vínculos, ver routes/index.js#/conta/meus-dados) e todos os certificados.
	// A sessão é a própria Pessoa (utils/sessao.js); quem está logado vem de
	// $rootScope.pessoaLogada (ui-routes.js#checkLoggedinPessoa).
	angular
	.module('PDIAP')
	//
	// Menu lateral (meu-painel.html): "Início" (resumo) e uma entrada por Mostra - a Mostra
	// escolhida mostra as participações dela e os certificados do mesmo ano.
	.controller('meuPainelCtrl', function($scope, $rootScope, $state, $window, $http, $mdToast, $mdSidenav, $mdMedia, contaAPI, certificadosService) {

		var logado = $rootScope.pessoaLogada || {};

		// Se por algum motivo chegou aqui sem ter definido senha ainda (ex: voltou pelo
		// histórico do navegador), manda pra tela obrigatória em vez de mostrar o painel.
		if (!logado.senhaDefinida) {
			$state.go('painelTrocarSenha');
			return;
		}

		$scope.nome = logado.nome;
		$scope.estadoDados = 'painelDados';
		$scope.ehAdmin = !!logado.admin;
		$scope.abrirAdmin = function() {
			$window.location.href = '/master';
		};
		$scope.estadoTrocarSenha = 'painelTrocarSenha';
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
		// md-list-item só vira item clicável com ng-click/ui-sref (ui-state não conta), por isso
		// a navegação do menu é por aqui.
		$scope.irPara = function(estado) {
			$state.go(estado);
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
