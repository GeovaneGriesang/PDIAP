(function(){
	'use strict';

	angular
	.module('PDIAPa')
	.controller('feirasCtrl', function($scope, $mdDialog, $mdToast, adminAPI) {

		$scope.toast = function(message,tema) {
			var toast = $mdToast.simple().textContent(message).action('✖').position('top right').theme(tema).hideDelay(10000);
			$mdToast.show(toast);
		};

		$scope.feiras = [];
		$scope.ano = new Date().getFullYear();
		$scope.year = CadastraAno();

		let mostraFeiras = function() {
			$scope.feiras = [];
			adminAPI.getFeiras()
			.success(function(feiras) {
				angular.forEach(feiras, function (value, key) {
					if (value.ano == $scope.ano) {
						$scope.feiras.push(value);
					}
				});
			})
			.error(function(status) {
				console.log("Error: "+status);
			});
		}
		$scope.mostraFeiras = mostraFeiras();

		$scope.recarregar = function(){
			mostraFeiras();
		}

		$scope.cadastrarFeira = function(feira) {

			let categorias = [];
			if (feira.categoriaFundamentalI) { categorias.push('Fundamental I (1º ao 5º anos)'); }
			if (feira.categoriaFundamentalII) { categorias.push('Fundamental II (6º ao 9º anos)'); }
			if (feira.categoriaEnsinoMedio) { categorias.push('Ensino Médio, Técnico e Superior'); }

			let fei = ({
				nome: feira.nome,
				categorias: categorias,
				textoCertificado: feira.textoCertificado,
				ano: $scope.ano,
				createdAt: new Date()
			});

			adminAPI.postFeira(fei)
			.success(function(data) {
				$scope.toast('Feira cadastrada com sucesso!','success-toast');
				mostraFeiras();
				resetForm();
			})
			.error(function(status) {
				$scope.toast('Falha.','failed-toast');
				console.log("Error: "+status);
			});
		};

		$scope.removerFeira = function(ev,id,nome) {
			var confirm = $mdDialog.confirm()
			.textContent('Deseja remover a feira '+nome+'?')
			.ariaLabel('Remover feira')
			.targetEvent(ev)
			.ok('Sim')
			.cancel('Não');
			$mdDialog.show(confirm).then(function() {
				adminAPI.removeFeira(id)
				.success(function(data) {
					$scope.toast('Feira removida com sucesso!','success-toast');
					var index = $scope.feiras.map(function(f) { return f._id; }).indexOf(id);
					if (index !== -1) {
						$scope.feiras.splice(index, 1);
					}
				})
				.error(function(status) {
					$scope.toast('Falha.','failed-toast');
					console.log("Error: "+status);
				});
			}, function() {});
		};

		let resetForm = function() {
			delete $scope.feira;
			$scope.feirasForm.$setPristine();
			$scope.feirasForm.$setUntouched();
		};
	});
})();
