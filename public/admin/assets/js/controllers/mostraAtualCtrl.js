(function(){
	'use strict';

	angular
	.module('PDIAPa')
	.controller('mostraAtualCtrl', function($scope, $rootScope, adminAPI) {

		$scope.mostras = [];
		$scope.carregou = false;
		$scope.salvando = false;

		let marcadaId = function() {
			var marcada = $scope.mostras.filter(function(m) { return m.marcada; })[0];
			return marcada ? marcada._id : null;
		};

		// A Mostra atual gravada no servidor é a fonte da verdade (o $rootScope pode estar
		// defasado se outra aba alterou); só depois de ela chegar a tela libera o Salvar.
		adminAPI.getMostras()
		.success(function(mostras) {
			adminAPI.getMostraAtual()
			.success(function(resposta) {
				var atualId = resposta && resposta.mostraId;
				mostras.forEach(function(m) { m.marcada = m._id === atualId; });
				$scope.mostras = mostras;
				$scope.carregou = true;
			})
			.error(function(status) {
				console.log('Error: '+status);
			});
		})
		.error(function(status) {
			console.log('Error: '+status);
		});

		// Só uma Mostra pode ficar marcada: marcar uma desmarca as outras (desmarcar a marcada
		// deixa nenhuma - aí vale a de maior ano).
		$scope.marcar = function(mostra) {
			if (!mostra.marcada) return;
			$scope.mostras.forEach(function(m) { if (m !== mostra) m.marcada = false; });
		};

		$scope.salvar = function() {
			var id = marcadaId();
			$scope.salvando = true;
			adminAPI.putMostraAtual(id)
			.success(function() {
				$scope.salvando = false;
				$rootScope.mostraAtualId = id;
				// A Mostra atual passa a ser a selecionada nos filtros das demais telas; sem
				// Mostra marcada, a seleção em uso fica como está.
				if (id) {
					var mostra = $scope.mostras.filter(function(m) { return m._id === id; })[0];
					$rootScope.mostraId = id;
					$rootScope.ano = mostra.ano;
				}
				$scope.toast('Mostra atual salva com sucesso!','success-toast');
			})
			.error(function(status) {
				$scope.salvando = false;
				console.log('Error: '+status);
				$scope.toast('Não foi possível salvar a Mostra atual.','failed-toast');
			});
		};

	});
})();
