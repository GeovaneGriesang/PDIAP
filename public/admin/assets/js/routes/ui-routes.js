(function(){
	'use strict';

	angular
	.module('PDIAPa')
	.config(function($locationProvider, $httpProvider, $stateProvider, $urlMatcherFactoryProvider, $urlRouterProvider) {

		$locationProvider.html5Mode(true);
		$urlMatcherFactoryProvider.caseInsensitive(true);
		// $urlRouterProvider.otherwise("/404");

		let checkLoggedin = function($q, $rootScope, $http, $window) {

			var deferred = $q.defer(); // Inicializa nova promissa
			$rootScope.logado = false;

			$http.get('/admin/loggedin').success(function(projetos, status) {
				console.log(status);
				if (status !== 403) { // Authenticated
					$rootScope.logado = true;
					deferred.resolve();
				} else { // Not Authenticated
					$rootScope.logado = false;
					$window.location.href="http://movaci.com.br";
					deferred.reject();
				}
			})
			.error(function(status) { // Not Authenticated
				$rootScope.logado = false;
				$window.location.href="http://movaci.com.br";
				deferred.reject();
			});
			return deferred.promise;
		};

		$stateProvider
		.state('home', {
			url: "/admin/home",
			views: {
				'': {
					templateUrl: '/admin/views/admin2.html',
					controller: 'admin2Ctrl'
				},
				'projetos@home': { templateUrl: '/admin/views/list-projetos.html' },
				'saberes@home': { templateUrl: '/admin/views/list-saberes.html' },
				'avaliadores@home': { templateUrl: '/admin/views/list-avaliadores.html' }
			},
			resolve: {
				loggedin: checkLoggedin
			}
		})
		.state('master', {
			url: "/master",
			views: {
				'': {
					templateUrl: '/admin/views/admin.html',
					controller: 'adminCtrl'
				},
				'@master': {
					templateUrl: '/admin/views/presenca_projetos.html',
					controller: 'projetosCtrl' 
				}
			}
			// resolve: {
			// 	loggedin: checkLoggedin
			// }
		})
		.state('master.seleciona-aprovados', {
			url: "/seleciona-aprovados",
			templateUrl: 'admin/views/aprovados.html',
			controller: 'projetosCtrl'
		})
		.state('master.inscricao-avaliadores', {
			url: "/avaliadores/inscricao",
			templateUrl: 'admin/views/avaliadores-iframe.html'
		})
		.state('master.presenca-projetos', {
			url: "/projetos/presenca",
			templateUrl: 'admin/views/presenca_projetos.html',
			controller: 'projetosCtrl'
		})
		.state('master.cadastro-eventos', {
			url: "/cadastro-eventos",
			templateUrl: 'admin/views/cadastro-eventos.html',
			controller: 'eventosCtrl'
		})
		.state('master.cadastro-participantes', {
			url: "/cadastro-participantes",
			templateUrl: 'admin/views/cadastro-participantes.html',
			controller: 'participantesCtrl'
		})
		.state('confirmando', {
			url: "/projetos/confirma/:idProjeto/:situacao",
			templateUrl: 'admin/views/confirmando.html',
			controller: 'confirmacaoCtrl'
		})
		.state('404', {
			url: "/404",
			templateUrl: 'admin/views/404.html'
		});
	});
})();
