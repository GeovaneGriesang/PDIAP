(function(){
	'use strict';

	angular
	.module('PDIAPav')
	.factory("avaliacaoAPI", function($http, $rootScope) {
		// Mostra atual (Editar > Mostra atual no admin), carregada no resolve das rotas
		// (routes/ui-routes.js) em $rootScope.mostraAtual. Sem Mostra atual configurada (ou sem
		// permissão pra ler), tudo cai no ano do calendário - o comportamento de antes.
		let _mostraAtualId = function() {
			return $rootScope.mostraAtual ? $rootScope.mostraAtual._id : undefined;
		};

		let _anoDaMostra = function() {
			return $rootScope.mostraAtual ? $rootScope.mostraAtual.ano : new Date().getFullYear();
		};

		// Projeto/documento da Mostra atual: por feiraId; sem feiraId (legado), pelo ano de
		// createdAt (mesma regra do admin, adminAPI.pertenceAMostra). Sem Mostra atual, só o ano
		// do calendário, como sempre foi.
		let _pertenceAMostraAtual = function(doc) {
			var mostra = $rootScope.mostraAtual;
			if (mostra && doc.feiraId) return doc.feiraId === mostra._id;
			return !!doc.createdAt && new Date(doc.createdAt).getFullYear() == _anoDaMostra();
		};

		// A edição (Feira tipo:'edicao') em uso dentro de uma lista de Feiras.
		let _edicaoDaMostra = function(feiras) {
			var mostra = $rootScope.mostraAtual;
			if (mostra) return feiras.filter(function(f) { return f._id === mostra._id; })[0];
			return feiras.filter(function(f) { return f.tipo === 'edicao' && f.ano == _anoDaMostra(); })[0];
		};

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
				// mostraId distingue duas Mostras no mesmo ano (undefined = só o ano, como antes)
				params: { ano: ano, mostraId: _mostraAtualId() }
			}
			return $http(request);
		};

		let _postConfirmarPremiados = function(payload) {
			const request = {
				url: '/admin/confirmarPremiados',
				method: 'POST',
				data: angular.extend({}, payload, { mostraId: _mostraAtualId() })
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
			anoDaMostra: _anoDaMostra,
			pertenceAMostraAtual: _pertenceAMostraAtual,
			edicaoDaMostra: _edicaoDaMostra,
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
