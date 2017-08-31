(function(){
	'use strict';

	angular
		.module('PDIAP')
		.config(function($httpProvider) {
		   	// Intercepta os erros do AJAX
		   	$httpProvider.interceptors.push("authInterceptor");
		});
})();
