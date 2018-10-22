(function(){	
	'use strict';

	angular
	.module('PDIAPa')
	.controller('opcoesProjetosCtrl', function($scope, $window, $location, $mdDialog, adminAPI) {					

		$scope.opcoes = {};

		$scope.carregarOpcoes = function(){
			adminAPI.getOpcoes().success(function(op){
				$scope.opcoes = op;
			})
			.error(function(status) {
				console.log(status);
			});
		}
		$scope.carregarOpcoes();		

	 	$scope.atualizarOpcoes = function(opcoes){
			adminAPI.postOpcoes(opcoes).success(function() {
				$scope.toast('Alterações realizadas com sucesso!','success-toast');
				$scope.carregarOpcoes();
			})
			.error(function(status) {
				console.log('Error: '+status);
			});
		}

	});
})();
