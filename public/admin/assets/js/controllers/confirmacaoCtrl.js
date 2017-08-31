(function(){
	'use strict';

	angular
	.module('PDIAPa')
	.controller('confirmacaoCtrl', function($scope, $state, $stateParams, adminAPI) {

		$scope.verif = 'pending';

		adminAPI.postConfirmacao($stateParams.idProjeto, $stateParams.situacao)
		.success(function(data) {
			if ($stateParams.situacao === '2456') {
				$scope.verif = 'sim';
			} else if ($stateParams.situacao === '9877') {
				$scope.verif = 'não';
			}
		})
		.error(function(status) {
			$scope.verif = 'erro';
			console.log("Error: "+status);
		});

	});
})();
