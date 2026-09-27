(function(){
	'use strict';

	// Login único: recuperação de senha e troca de painel que não diferenciam Avaliador de
	// Participante (ver routes/index.js#/conta/esqueci-senha e #/dashboard/trocar-papel).
	angular
	.module('PDIAP')
	.factory('contaAPI', function($http) {

		let _redefinirSenha = function(email){
			return $http({ url: '/conta/esqueci-senha', method: 'POST', data: { email: email } });
		};

		let _novaSenhaComToken = function(token, password){
			return $http({ url: '/conta/nova-senha/' + token, method: 'POST', data: { password: password } });
		};

		let _trocarPapel = function(){
			return $http({ url: '/dashboard/trocar-papel', method: 'GET' });
		};

		return {
			redefinirSenha: _redefinirSenha,
			novaSenhaComToken: _novaSenhaComToken,
			trocarPapel: _trocarPapel
		};
	});
})();
