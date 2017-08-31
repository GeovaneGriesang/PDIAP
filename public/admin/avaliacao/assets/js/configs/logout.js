(function(){
	'use strict';

	angular
		.module('PDIAPav')
		.run(function($rootScope, $http, $window) {
		   	// Função logout está disponível em todas as páginas
		   	$rootScope.logout = function() {
		   		$http.post('/admin/logout');
		   		$rootScope.logado = false;
					$window.location.href="http://www.movaci.com.br/admin/avaliacao";
				};
		});
})();
