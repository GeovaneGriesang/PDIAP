(function(){
	'use strict';

	// Bloco "Minha conta" (views/conta-minha-conta.html), incluído em "Meus dados" do painel:
	// identidade da Pessoa (nome e documento só a organização altera) e os e-mails de acesso -
	// principal + até 2 alternativos, todos com confirmação por link (ver routes/index.js#/conta).
	angular
	.module('PDIAP')
	.controller('contaDadosCtrl', function($scope, $mdToast, contaAPI) {

		$scope.conta = null;
		$scope.trocaEmail = { aberta: false, modo: 'principal', novoEmail: '', senha: '', enviando: false };

		var NACIONALIDADES = { brasileiro: 'Brasileiro(a)', paraguaio: 'Paraguaio(a)', uruguaio: 'Uruguaio(a)', venezuelano: 'Venezuelano(a)', outro: 'Outra nacionalidade' };
		$scope.nomeNacionalidade = function(n) { return NACIONALIDADES[n] || n || '-'; };
		$scope.opcoesNacionalidade = Object.keys(NACIONALIDADES).map(function(k) { return { valor: k, nome: NACIONALIDADES[k] }; });
		$scope.nacionalidade = { valor: null, salvando: false };

		var toast = function(message, tema) {
			$mdToast.show($mdToast.simple().textContent(message).action('✖').position('top right').theme(tema).hideDelay(8000));
		};

		var carregar = function() {
			contaAPI.getMeusDados()
			.then(function(response) {
				$scope.conta = response.data;
				$scope.nacionalidade.valor = response.data.nacionalidade || null;
			}, function(response) {
				toast(response.data || 'Não foi possível carregar seus dados.', 'failed-toast');
			});
		};
		carregar();

		// Formulário de e-mail: modo 'principal' (trocar o principal ou tornar principal um
		// alternativo - esse último sem link, já foi confirmado) ou 'alternativo' (incluir mais um).
		$scope.abrirTrocaEmail = function(modo, email) {
			$scope.trocaEmail = { aberta: true, modo: modo || 'principal', novoEmail: email || '', fixo: !!email, senha: '', enviando: false };
		};

		$scope.cancelarTrocaEmail = function() {
			$scope.trocaEmail.aberta = false;
		};

		$scope.podeIncluirEmail = function() {
			return $scope.conta && (1 + ($scope.conta.emailsAlternativos || []).length) < ($scope.conta.maxEmails || 3);
		};

		$scope.pedirTrocaEmail = function() {
			$scope.trocaEmail.enviando = true;
			var pedido = $scope.trocaEmail.modo === 'alternativo'
				? contaAPI.adicionarEmail($scope.trocaEmail.novoEmail, $scope.trocaEmail.senha)
				: contaAPI.alterarEmail($scope.trocaEmail.novoEmail, $scope.trocaEmail.senha);
			pedido
			.then(function(response) {
				$scope.trocaEmail.aberta = false;
				if (response.data.trocado) {
					$scope.conta.email = response.data.email;
					$scope.conta.emailsAlternativos = response.data.emailsAlternativos;
					toast('Pronto! ' + response.data.email + ' agora é o seu e-mail principal.', 'success-toast');
					return;
				}
				$scope.conta.emailPendente = response.data.emailPendente;
				$scope.conta.emailPendenteTipo = response.data.emailPendenteTipo;
				toast('Enviamos um link de confirmação para ' + response.data.emailPendente + '. O e-mail só passa a valer depois que você clicar nele.', 'success-toast');
			}, function(response) {
				toast(typeof response.data === 'string' && response.data ? response.data : 'Não foi possível pedir a alteração de e-mail.', 'failed-toast');
			})
			.finally(function() {
				$scope.trocaEmail.enviando = false;
			});
		};

		// Nacionalidade: a própria pessoa altera (ver routes/index.js#/conta/nacionalidade).
		$scope.salvarNacionalidade = function() {
			$scope.nacionalidade.salvando = true;
			contaAPI.alterarNacionalidade($scope.nacionalidade.valor)
			.then(function(response) {
				$scope.conta.nacionalidade = response.data.nacionalidade;
				toast('Nacionalidade atualizada.', 'success-toast');
			}, function(response) {
				toast(typeof response.data === 'string' && response.data ? response.data : 'Não foi possível alterar a nacionalidade.', 'failed-toast');
			})
			.finally(function() {
				$scope.nacionalidade.salvando = false;
			});
		};

		$scope.removerEmail = function(email) {
			contaAPI.removerEmail(email)
			.then(function(response) {
				$scope.conta.emailsAlternativos = response.data.emailsAlternativos;
				toast('E-mail ' + email + ' removido. Ele não serve mais para entrar.', 'success-toast');
			}, function(response) {
				toast(typeof response.data === 'string' && response.data ? response.data : 'Não foi possível remover o e-mail.', 'failed-toast');
			});
		};
	});
})();
