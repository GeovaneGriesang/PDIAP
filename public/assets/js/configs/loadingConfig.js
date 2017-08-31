(function(){
	'use strict';

	angular
	.module('PDIAP')
	.directive('usSpinner', ['$http', '$rootScope', '$timeout' ,function ($http, $rootScope, $timeout){
		return {
			link: function (scope, elm, attrs)
			{
				$rootScope.spinnerActive = false;
				scope.isLoading = function () {
					return $http.pendingRequests.length > 0;
				};

				scope.$watch(scope.isLoading, function (loading)
				{
					$rootScope.spinnerActive = loading;
					if(loading){
						elm.removeClass('ng-hide');
					}else{
						// $timeout(function() {
						elm.addClass('ng-hide');
						// }, 2000);
					}
				});
			}
		};
	}]);
})();
