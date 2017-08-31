(function(){
	'use strict';

	angular
		.module('PDIAP')
		.run(function($rootScope, $http, $window) {
		   	// Função logout está disponível em todas as páginas
		   	$rootScope.logout = function() {
		   		$http.post('/projetos/logout');
		   		$rootScope.logado = false;
					// localStorage.removeItem('token');
		  		// $location.url('/');
					$window.location.href="http://movaci.com.br";
		   	};
		});
})();
