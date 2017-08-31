(function(){
	'use strict';

	angular
	.module('PDIAP')
	.factory("authInterceptor", function ($q, $location, $rootScope, $timeout) {
		return {
			request: function(config) {
				$rootScope.loading = true;
				// config.headers = config.headers || {};
				// if (localStorage.getItem('token')) {
				// 	config.headers.Authorization = 'Bearer' + localStorage.getItem('token');
				// }
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
				// if (rejection.status === 401 || rejection.status === 403)
				// console.log(rejection.status);
				return $q.reject(rejection);
			}
		};
	});
})();
