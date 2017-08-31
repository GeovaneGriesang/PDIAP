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

			$http.get('/admin/loggedin').success(function(projetos) {
				if (projetos !== '0') { // Authenticated
					$rootScope.logado = true;
					deferred.resolve();
				} else { // Not Authenticated
					$rootScope.logado = false;
					$window.location.href="http://www.movaci.com.br/avaliacao/2016";
					deferred.reject();
				}
			});
			return deferred.promise;
		};

		$stateProvider
		// .state('admin', {
		// 	url: "/admin/avaliacao",
		// 	views: {
		// 		'': {
		// 			templateUrl: '/admin/views/login.html',
		// 			controller: 'loginCtrl'
		// 		}
		// 	}
		// })
		.state('home', {
			url: "/avaliacao/2016/:id",
			views: {
				'': {
					templateUrl: '/admin/avaliacao/views/avaliacao.html',
					controller: 'avaliacaoCtrl'
				}
			},
			resolve: {
				loggedin: checkLoggedin
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
				'mostratec@ranking': { templateUrl: '/admin/avaliacao/views/list-mostratec.html' }
			},
			resolve: {
				loggedin: checkLoggedin
			}
		})
		.state('404', {
			url: "/404",
			templateUrl: 'admin/avaliacao/views/404.html'
		});
	});
})();
