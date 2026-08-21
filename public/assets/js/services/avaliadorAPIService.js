(function(){
	'use strict';

	angular
	.module('PDIAP')
	.factory('avaliadorAPI', function($http) {

		let _getDados = function(){
			return $http({ url: '/avaliadores/dashboard/meus-dados', method: 'GET' });
		};

		let _putDados = function(dados){
			return $http({ url: '/avaliadores/dashboard/meus-dados', method: 'PUT', data: dados });
		};

		let _getCertificados = function(){
			return $http({ url: '/avaliadores/dashboard/meus-certificados', method: 'GET' });
		};

		let _trocarSenha = function(senhaAtual, novaSenha){
			return $http({ url: '/avaliadores/dashboard/trocar-senha', method: 'POST', data: { senhaAtual: senhaAtual, novaSenha: novaSenha } });
		};

		let _redefinirSenha = function(email){
			return $http({ url: '/avaliadores/dashboard/redefinir-senha', method: 'POST', data: { email: email } });
		};

		let _novaSenhaComToken = function(token, password){
			return $http({ url: '/avaliadores/dashboard/nova-senha/' + token, method: 'POST', data: { password: password } });
		};

		return {
			getDados: _getDados,
			putDados: _putDados,
			getCertificados: _getCertificados,
			trocarSenha: _trocarSenha,
			redefinirSenha: _redefinirSenha,
			novaSenhaComToken: _novaSenhaComToken
		};
	});
})();
