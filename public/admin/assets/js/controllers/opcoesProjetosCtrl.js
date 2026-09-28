(function(){	
	'use strict';

	angular
	.module('PDIAPa')
	.controller('opcoesProjetosCtrl', function($scope, $window, $location, $mdDialog, adminAPI) {					

		$scope.opcoes = {};

		$scope.carregarOpcoes = function(){
			adminAPI.getOpcoes().then(function(response){
				$scope.opcoes = response.data;
			}, function(response) {
				console.log(response.data);
			});
		}
		$scope.carregarOpcoes();

	 	$scope.atualizarOpcoes = function(opcoes){
			adminAPI.postOpcoes(opcoes).then(function() {
				$scope.toast('Alterações realizadas com sucesso!','success-toast');
				$scope.carregarOpcoes();
			}, function(response) {
				console.log('Error: '+response.data);
			});
		}

	});
})();
