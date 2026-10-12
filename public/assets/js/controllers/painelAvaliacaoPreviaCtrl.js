(function(){
	'use strict';

	// Avaliação prévia de um trabalho no "Meu painel" (painel-avaliacao-previa.html,
	// /painel/avaliacao-previa/:id - routes/painel-avaliacoes.js): texto do trabalho e a ficha da
	// categoria, com o total somado na hora. O servidor confere de novo notas, máximos e prazo.
	angular
	.module('PDIAP')
	.controller('painelAvaliacaoPreviaCtrl', function($scope, $rootScope, $state, $stateParams, $http, $mdToast) {

		if (!($rootScope.pessoaLogada && $rootScope.pessoaLogada.senhaDefinida)) {
			$state.go('painelTrocarSenha');
			return;
		}

		var base = '/api/painel/avaliacoes-previas/' + $stateParams.id;
		$scope.urlTexto = base + '/texto';
		$scope.carregando = true;
		$scope.erro = null;
		$scope.av = {};
		$scope.notas = [];
		$scope.form = { parecer: '' };
		$scope.salvando = false;

		$scope.toast = function(message, tema) {
			$mdToast.show($mdToast.simple().textContent(message).action('✖').position('top right').theme(tema).hideDelay(6000));
		};
		var erroDe = function(response, padrao) {
			return typeof response.data === 'string' && response.data ? response.data : padrao;
		};

		var carregar = function() {
			$http.get(base).then(function(response) {
				$scope.av = response.data;
				$scope.notas = $scope.av.ficha.map(function(k, i) {
					var n = $scope.av.notas[i];
					return n === null || n === undefined ? null : n;
				});
				$scope.form.parecer = $scope.av.parecer;
				$scope.carregando = false;
			}, function(response) {
				$scope.erro = erroDe(response, 'Não foi possível abrir o trabalho.');
				$scope.carregando = false;
			});
		};
		carregar();

		$scope.virgula = function(n) { return n === null || n === undefined ? '' : String(n).replace('.', ','); };
		$scope.maximo = function() {
			return ($scope.av.ficha || []).reduce(function(s, k) { return s + k.maximo; }, 0);
		};
		// null enquanto faltar nota (ou alguma estiver fora do limite).
		$scope.total = function() {
			var ficha = $scope.av.ficha || [], soma = 0;
			for (var i = 0; i < ficha.length; i++) {
				var n = $scope.notas[i];
				if (n === null || n === undefined || n === '' || isNaN(n) || n < 0 || n > ficha[i].maximo) return null;
				soma += Number(n);
			}
			return Math.round(soma * 100) / 100;
		};

		$scope.aceitar = function() {
			$scope.salvando = true;
			$http.post(base + '/aceitar').then(function() {
				$scope.toast('Convite aceito.', 'success-toast');
				carregar();
			}, function(response) {
				$scope.toast(erroDe(response, 'Não foi possível aceitar.'), 'failed-toast');
			}).finally(function() { $scope.salvando = false; });
		};

		$scope.salvar = function(concluir) {
			$scope.salvando = true;
			$http.put(base, { notas: $scope.notas, parecer: $scope.form.parecer, concluir: concluir }).then(function() {
				$scope.toast(concluir ? 'Avaliação concluída. Obrigado(a)!' : 'Rascunho guardado.', 'success-toast');
				if (concluir) $state.go('painel'); else carregar();
			}, function(response) {
				$scope.toast(erroDe(response, 'Não foi possível salvar.'), 'failed-toast');
			}).finally(function() { $scope.salvando = false; });
		};
	});
})();
