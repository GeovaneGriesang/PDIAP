(function(){
	'use strict';

	// Conta da pessoa logada no painel único (ver routes/index.js#/conta/*): senha, recuperação
	// de senha, "Meus dados" e os e-mails de acesso (principal + alternativos).
	angular
	.module('PDIAP')
	.factory('contaAPI', function($http) {

		let _redefinirSenha = function(email){
			return $http({ url: '/conta/esqueci-senha', method: 'POST', data: { email: email } });
		};

		let _novaSenhaComToken = function(token, password){
			return $http({ url: '/conta/nova-senha/' + token, method: 'POST', data: { password: password } });
		};

		let _trocarSenha = function(senhaAtual, novaSenha){
			return $http({ url: '/conta/trocar-senha', method: 'POST', data: { senhaAtual: senhaAtual, novaSenha: novaSenha } });
		};

		let _getMeusDados = function(){
			return $http({ url: '/conta/meus-dados', method: 'GET' });
		};

		let _alterarEmail = function(novoEmail, senha){
			return $http({ url: '/conta/alterar-email', method: 'POST', data: { novoEmail: novoEmail, senha: senha } });
		};

		let _adicionarEmail = function(novoEmail, senha){
			return $http({ url: '/conta/emails-alternativos', method: 'POST', data: { novoEmail: novoEmail, senha: senha } });
		};

		let _alterarNacionalidade = function(nacionalidade){
			return $http({ url: '/conta/nacionalidade', method: 'POST', data: { nacionalidade: nacionalidade } });
		};

		let _removerEmail = function(email){
			return $http({ url: '/conta/emails-alternativos/remover', method: 'POST', data: { email: email } });
		};

		return {
			getMeusDados: _getMeusDados,
			alterarEmail: _alterarEmail,
			adicionarEmail: _adicionarEmail,
			removerEmail: _removerEmail,
			alterarNacionalidade: _alterarNacionalidade,
			trocarSenha: _trocarSenha,
			redefinirSenha: _redefinirSenha,
			novaSenhaComToken: _novaSenhaComToken
		};
	});
})();
