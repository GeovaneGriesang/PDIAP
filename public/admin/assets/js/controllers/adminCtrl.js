(function(){
	'use strict';

	angular
	.module('PDIAPa')
	.controller('adminCtrl', function($scope, $mdToast, $mdSidenav) {

		$scope.toggleSidenav = function(menu) {
			$mdSidenav(menu).toggle();
		};

		$scope.toast = function(message,tema) {
			var toast = $mdToast.simple().textContent(message).action('✖').position('top right').theme(tema).hideDelay(10000);
			$mdToast.show(toast);
		};

	});
})();
