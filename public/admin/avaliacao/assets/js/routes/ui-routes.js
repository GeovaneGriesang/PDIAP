(function(){
	'use strict';

	angular
	.module('PDIAPav')
	.config(function($locationProvider, $httpProvider, $stateProvider, $urlMatcherFactoryProvider, $urlRouterProvider) {

		$locationProvider.html5Mode(true);
		$urlMatcherFactoryProvider.caseInsensitive(true);
		// $urlRouterProvider.otherwise("/404");

		let checkLoggedin = function($q, $rootScope, $http, $window) {

			var deferred = $q.defer(); // Inicializa nova promissa
			$rootScope.logado = false;

			$http.get('/admin/loggedin').then(function(response) {
				if (response.data !== '0') { // Authenticated
					$rootScope.logado = true;
					deferred.resolve();
				} else { // Not Authenticated
					$rootScope.logado = false;
					$window.location.href="http://www.movaci.com.br/avaliacao/2016";
					deferred.reject();
				}
			}, function() {
				$rootScope.logado = false;
				$window.location.href="http://www.movaci.com.br/avaliacao/2016";
				deferred.reject();
			});
			return deferred.promise;
		};

		// Mostra atual (Editar > Mostra atual no admin) vira $rootScope.mostraAtual (a Feira
		// tipo:'edicao' inteira) - Ranking e Avaliação passam a usar o ano/_id dela em vez do
		// ano do calendário (ver avaliacaoAPI.anoDaMostra). Qualquer falha (sem Mostra atual
		// configurada, sem permissão, erro de rede) deixa null e vale o ano do calendário, como
		// sempre valeu - nunca trava a tela.
		let carregarMostraAtual = function($q, $rootScope, $http, loggedin) {
			var deferred = $q.defer();
			$rootScope.mostraAtual = null;
			$http.get('/admin/mostraAtual').then(function(resposta) {
				var id = resposta.data && resposta.data.mostraId;
				if (!id) return deferred.resolve();
				$http.get('/admin/mostraFeiras').then(function(feiras) {
					$rootScope.mostraAtual = (feiras.data || []).filter(function(f) { return f._id === id && f.tipo === 'edicao'; })[0] || null;
					deferred.resolve();
				}, function() { deferred.resolve(); });
			}, function() { deferred.resolve(); });
			return deferred.promise;
		};

		$stateProvider
		/* .state('admin', {
		 	url: "/admin/avaliacao",
		 	views: {
		 		'': {
		 			templateUrl: '/admin/views/login.html',
		 			controller: 'loginCtrl'
		 		}
		 	}
		 })*/
		.state('home', {
			url: "/avaliacao/2016/:id",
			views: {
				'': {
					templateUrl: '/admin/avaliacao/views/avaliacao.html',
					controller: 'avaliacaoCtrl'
				}
			},
			resolve: {
				loggedin: checkLoggedin,
				mostraAtual: carregarMostraAtual
			}
		})
		.state('ranking', {
			url: "/ranking/2016",
			views: {
				'': {
					templateUrl: '/admin/avaliacao/views/ranking.html',
					controller: 'rankingCtrl'
				},
				'ranking1@ranking': { templateUrl: '/admin/avaliacao/views/list-ranking1.html' },
				'ranking2@ranking': { templateUrl: '/admin/avaliacao/views/list-ranking2.html' },
				'ranking3@ranking': { templateUrl: '/admin/avaliacao/views/list-ranking3.html' },
				'feiras@ranking': { templateUrl: '/admin/avaliacao/views/list-feiras.html' },
				'mencaoHonrosa@ranking': { templateUrl: '/admin/avaliacao/views/list-mencao-honrosa.html' }
			},
			resolve: {
				loggedin: checkLoggedin,
				mostraAtual: carregarMostraAtual
			}
		})
		.state('404', {
			url: "/404",
			templateUrl: 'admin/avaliacao/views/404.html'
		});
	});
})();
