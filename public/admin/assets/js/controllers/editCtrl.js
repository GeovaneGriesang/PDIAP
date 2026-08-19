(function(){
	'use strict';

	angular
	.module('PDIAPa')
	.controller('editCtrl', function($scope, $window, $location, $mdDialog, adminAPI) {

		
		$scope.edits = [];			

		$scope.carregarEdits = function(){
			adminAPI.getEdits().success(function(edits){
				if (!edits[0].prazoProjetos) edits[0].prazoProjetos = {};
				if (!edits[0].prazoAvaliadores) edits[0].prazoAvaliadores = {};
				['prazoProjetos','prazoAvaliadores'].forEach(function(campo) {
					if (edits[0][campo].dataPrazo) edits[0][campo].dataPrazo = new Date(edits[0][campo].dataPrazo);
					if (edits[0][campo].dataProrrogacao) edits[0][campo].dataProrrogacao = new Date(edits[0][campo].dataProrrogacao);
				});
				if (!edits[0].botoes) edits[0].botoes = [];
				if (!edits[0].destaques) edits[0].destaques = [];
				$scope.edits = edits;
			})
			.error(function(status) {
				console.log(status);
			});
		}
		$scope.carregarEdits();

		$scope.addBotao = function() { $scope.edits[0].botoes.push({texto:'', link:''}); };
		$scope.removeBotao = function(idx) { $scope.edits[0].botoes.splice(idx, 1); };
		$scope.addDestaque = function() { $scope.edits[0].destaques.push({texto:''}); };
		$scope.removeDestaque = function(idx) { $scope.edits[0].destaques.splice(idx, 1); };

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
