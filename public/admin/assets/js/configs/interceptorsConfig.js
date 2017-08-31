(function(){
	'use strict';

	angular
		.module('PDIAPa')
		.config(function($httpProvider) {
		   	// Intercepta os erros do AJAX
		   	$httpProvider.interceptors.push("authInterceptor");
		});
})();
