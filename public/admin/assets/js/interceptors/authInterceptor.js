(function(){
	'use strict';

	angular
	.module('PDIAPa')
	.factory("authInterceptor", function ($q, $location, $rootScope, $timeout) {
		return {
			request: function(config) {
				$rootScope.loading = true;
				return config;
			},
			requestError: function(rejection) {
				$rootScope.loading = false;
				return $q.reject(rejection);
			},
			response: function(response) {
				$timeout(function() {
					$rootScope.loading = false;
				}, 800);
				return response;
			},
			responseError: function(rejection) {
				$rootScope.loading = false;
				console.log("response: "+rejection.status);
				return $q.reject(rejection);
			}
		};
	});
})();
