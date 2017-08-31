(function(){
	'use strict';

	angular
	.module('PDIAPa')
	.controller('homeCtrl', function($scope, $mdDialog, $mdSidenav, $mdToast) {

		$scope.showLoginDialog = function(ev) {
			$mdDialog.show({
				// controller: () => this,
				templateUrl: 'admin/views/login.html',
				parent: angular.element(document.body),
				targetEvent: ev,
				clickOutsideToClose: false
			});
		};

		// $scope.toggleSidenav = function(menu) {
		// 	$mdSidenav(menu).toggle();
		// };
		// $scope.toast = function(message,tema) {
		// 	var toast = $mdToast.simple().textContent(message).action('✖').position('top right').theme(tema).hideDelay(10000);
		// 	$mdToast.show(toast);
		// };

	});
})();
