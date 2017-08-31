(function(){
	'use strict';

	angular
	.module('PDIAPav')
	.controller('homeCtrl', function($scope, $mdDialog) {

		$scope.showLoginDialog = function(ev) {
			$mdDialog.show({
				// controller: () => this,
				templateUrl: 'admin/avaliacao/views/login.html',
				parent: angular.element(document.body),
				targetEvent: ev,
				clickOutsideToClose: false
			});
		};

	});
})();
