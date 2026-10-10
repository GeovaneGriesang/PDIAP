(function(){
	'use strict';

	// Bloco "Minha conta" (views/conta-minha-conta.html), incluído em "Meus dados" do avaliador
	// e do participante: identidade da Pessoa (nome e documento só a organização altera), troca
	// de e-mail com confirmação por link e participações em cada Mostra (ver
	// routes/index.js#/conta/meus-dados).
	angular
	.module('PDIAP')
	.controller('contaDadosCtrl', function($scope, $mdToast, contaAPI) {

		$scope.conta = null;
		$scope.trocaEmail = { aberta: false, novoEmail: '', senha: '', enviando: false };

		var NACIONALIDADES = { brasileiro: 'Brasileiro(a)', paraguaio: 'Paraguaio(a)', uruguaio: 'Uruguaio(a)', venezuelano: 'Venezuelano(a)', outro: 'Outra nacionalidade' };
		$scope.nomeNacionalidade = function(n) { return NACIONALIDADES[n] || n || '-'; };

		var toast = function(message, tema) {
			$mdToast.show($mdToast.simple().textContent(message).action('✖').position('top right').theme(tema).hideDelay(8000));
		};

		var carregar = function() {
			contaAPI.getMeusDados()
			.then(function(response) {
				$scope.conta = response.data;
			}, function(response) {
				toast(response.data || 'Não foi possível carregar seus dados.', 'failed-toast');
			});
		};
		carregar();

		$scope.abrirTrocaEmail = function() {
			$scope.trocaEmail = { aberta: true, novoEmail: '', senha: '', enviando: false };
		};

		$scope.cancelarTrocaEmail = function() {
			$scope.trocaEmail.aberta = false;
		};

		$scope.pedirTrocaEmail = function() {
			$scope.trocaEmail.enviando = true;
			contaAPI.alterarEmail($scope.trocaEmail.novoEmail, $scope.trocaEmail.senha)
			.then(function(response) {
				$scope.conta.emailPendente = response.data.emailPendente;
				$scope.trocaEmail.aberta = false;
				toast('Enviamos um link de confirmação para ' + response.data.emailPendente + '. O e-mail só muda depois que você clicar nele.', 'success-toast');
			}, function(response) {
				toast(typeof response.data === 'string' && response.data ? response.data : 'Não foi possível pedir a troca de e-mail.', 'failed-toast');
			})
			.finally(function() {
				$scope.trocaEmail.enviando = false;
			});
		};
	});
})();
