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

		return {
			postLoginAvaliador: _postLoginAvaliador,
			getTodosProjetos: _getTodosProjetos,
			putAvaliacao: _putAvaliacao
		};
	});
})();
