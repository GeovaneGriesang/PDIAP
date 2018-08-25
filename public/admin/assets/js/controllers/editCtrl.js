(function(){
	'use strict';

	angular
	.module('PDIAPa')
	.controller('editCtrl', function($scope, $window, $location, $mdDialog, adminAPI) {

		
		$scope.edits = [];			

		$scope.carregarEdits = function(){
			adminAPI.getEdits().success(function(edits){
				$scope.edits = edits;
			})
			.error(function(status) {
				console.log(status);
			});
		}
		$scope.carregarEdits();

	 	$scope.atualizarEdit = function(edit){
			adminAPI.postEdit(edit).success(function() {
				$scope.toast('Alterações realizadas com sucesso!','success-toast');
				$scope.carregarEdits();
				resetForm();
			})
			.error(function(status) {
				console.log('Error: '+status);
			});
		}
			
		
		let resetForm = function() {
			$scope.editForm.$setPristine();
			$scope.editForm.$setUntouched();
		};

	});
})();
