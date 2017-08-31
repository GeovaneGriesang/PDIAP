// (function(){
// 	'use strict';
//
// 	angular
// 		.module('PDIAP')
// 		.config(function($locationProvider, $httpProvider) {
//
//     		// Verifica se o usuário está logado
// 		   	let checkLoggedin = function($q, $http, $location, $rootScope) {
//
// 		      	var deferred = $q.defer(); // Inicializa nova promissa
// 		      	$rootScope.logado = false;
//
// 		      	$http.get('/projetos/home').success(function(projeto) {
// 		        	if (projeto !== '0') { // Authenticated
// 		          		$rootScope.logado = true;
// 		          		deferred.resolve();
// 		    		} else { // Not Authenticated
// 			          	$rootScope.logado = false;
// 			          	deferred.reject();
// 			          	$location.url('/login');
// 		      		}
// 		  		});
//
// 		      	return deferred.promise;
// 		  	};
//
// 		   	// Intercepta os erros do AJAX
// 		   	$httpProvider.interceptors.push("authInterceptor");
// 		})
// 		.run(function($rootScope, $http, $location) {
// 		   	// Função logout está disponível em todas as páginas
// 		   	$rootScope.logout = function() {
// 		   		$http.post('/projetos/logout');
// 		   		localStorage.removeItem('token');
// 		   		$rootScope.logado = false;
// 		  		$location.url('/login');
// 		   	};
// 		});
// })();
