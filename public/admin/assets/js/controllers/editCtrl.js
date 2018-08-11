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
		
		$scope.atualizarEdit = function(edit){
			adminAPI.postEdit(edit).success(function() {
				$scope.toast('Alterações realizadas com sucesso!','success-toast');
				$scope.carregarEdits();
				resetForm();
			})
			.error(function(status) {
				console.log('Error: '+status);
			});/*success(function(data, status) {
				if (data === 'success') {
					let showConfirmDialog = function(ev) {
						var confirm = $mdDialog.confirm()
						.title('Parabéns!')
						.textContent('Inscrição realizada com sucesso!')
						.ariaLabel('Inscrição realizada com sucesso!')
						.targetEvent(ev)
						.ok('OK')
						$mdDialog.show(confirm);
					};
					showConfirmDialog();
					resetForm();
				} else {
					let showConfirmDialog = function(ev) {
						var confirm = $mdDialog.confirm()
						.title('Ops...')
						.textContent('A inscrição não foi realizada. Por favor, tente novamente.')
						.ariaLabel('A inscrição não foi realizada.')
						.targetEvent(ev)
						.theme('error')
						.ok('OK');
						$mdDialog.show(confirm);
					};
					showConfirmDialog();
				}
			})
			.error(function(status) {
				let showConfirmDialog = function(ev) {
					var confirm = $mdDialog.confirm()
					.title('Ops...')
					.textContent('A inscrição não foi realizada. Por favor, tente novamente.')
					.ariaLabel('A inscrição não foi realizada.')
					.targetEvent(ev)
					.theme('error')
					.ok('OK');
					$mdDialog.show(confirm);
				};
				showConfirmDialog();
				console.log(status);
			});*/


/**/
		}

			
		
		let resetForm = function() {
			$scope.editForm.$setPristine();
			$scope.editForm.$setUntouched();
		};

	});
})();
