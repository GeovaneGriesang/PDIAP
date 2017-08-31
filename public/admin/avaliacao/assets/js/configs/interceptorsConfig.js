(function(){
	'use strict';

	angular
		.module('PDIAPav')
		.config(function($httpProvider) {
		   	// Intercepta os erros do AJAX
		   	$httpProvider.interceptors.push("authInterceptor");
		});
})();
