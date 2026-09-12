(function(){
	'use strict';

	angular
	.module('PDIAPav')
	.factory("avaliacaoAPI", function($http) {
		let _postLoginAvaliador = function(username,password) {
			const request = {
				url: '/admin/login',
				method: 'POST',
				data: {
					username: username,
					password: password
				}
			}
			return $http(request);
		};

		let _getTodosProjetos = function() {
			const request = {
				url: '/admin/projetos',
				method: 'GET',
			}
			return $http(request);
		};

		let _getFeiras = function() {
			const request = {
				url: '/admin/mostraFeiras',
				method: 'GET'
			}
			return $http(request);
		};

		let _putAvaliacao = function(id,notas) {
			const request = {
				url: '/avaliadores/addNota',
				method: 'PUT',
				data: {
					id: id,
					adrovan: notas
				}
			}
			return $http(request);
		};

		let _getConfigPremiacao = function(ano) {
			const request = {
				url: '/admin/configPremiacao',
				method: 'GET',
				params: { ano: ano }
			}
			return $http(request);
		};

		let _postConfirmarPremiados = function(payload) {
			const request = {
				url: '/admin/confirmarPremiados',
				method: 'POST',
				data: payload
			}
			return $http(request);
		};

		// Mesma rota usada em Projetos > Premiação (adminAPIService.js#putPremiadoProjetos) -
		// permite editar Premiado/Menção honrosa/classificação pra feiras direto da tela de
		// Ranking, sem precisar sair pra outra tela.
		let _putPremiadoProjetos = function(payload) {
			const request = {
				url: '/admin/setPremiadoProjetos',
				method: 'PUT',
				data: payload
			}
			return $http(request);
		};

		return {
			postLoginAvaliador: _postLoginAvaliador,
			getTodosProjetos: _getTodosProjetos,
			getFeiras: _getFeiras,
			putAvaliacao: _putAvaliacao,
			getConfigPremiacao: _getConfigPremiacao,
			postConfirmarPremiados: _postConfirmarPremiados,
			putPremiadoProjetos: _putPremiadoProjetos
		};
	});
})();
