(function(){
	'use strict';

	angular
	.module('PDIAP')
	.directive('uiAlert', function() {
		return {
			templateUrl: "views/alert.html",
			replace: true,
			restrict: "AE",
			scope: {
				title: "@",
				message: "@"
			}
		};
	});
})();
