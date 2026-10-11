(function(){
	'use strict';

	// Dados próprios de avaliador(a) no "Meus dados" do painel único. Senha, recuperação de
	// senha e quem está logado são da conta (services/contaAPIService.js).
	angular
	.module('PDIAP')
	.factory('avaliadorAPI', function($http) {

		let _getDados = function(){
			return $http({ url: '/avaliadores/dashboard/meus-dados', method: 'GET' });
		};

		let _putDados = function(dados){
			return $http({ url: '/avaliadores/dashboard/meus-dados', method: 'PUT', data: dados });
		};

		return {
			getDados: _getDados,
			putDados: _putDados
		};
	});
})();
