(function(){
	'use strict';

	angular
	.module('PDIAP')
	.factory('participanteAPI', function($http) {

		let _getDados = function(){
			return $http({ url: '/participantes/dashboard/loggedin', method: 'GET' });
		};

		let _getCertificados = function(){
			return $http({ url: '/participantes/dashboard/meus-certificados', method: 'GET' });
		};

		let _trocarSenha = function(senhaAtual, novaSenha){
			return $http({ url: '/participantes/dashboard/trocar-senha', method: 'POST', data: { senhaAtual: senhaAtual, novaSenha: novaSenha } });
		};

		let _redefinirSenha = function(email){
			return $http({ url: '/participantes/dashboard/redefinir-senha', method: 'POST', data: { email: email } });
		};

		let _novaSenhaComToken = function(token, password){
			return $http({ url: '/participantes/dashboard/nova-senha/' + token, method: 'POST', data: { password: password } });
		};

		return {
			getDados: _getDados,
			getCertificados: _getCertificados,
			trocarSenha: _trocarSenha,
			redefinirSenha: _redefinirSenha,
			novaSenhaComToken: _novaSenhaComToken
		};
	});
})();
