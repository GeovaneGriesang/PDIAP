(function(){
	'use strict';

	// Avaliação no evento de um trabalho no "Meu painel" (painel-avaliacao-final.html,
	// /painel/avaliacao-evento/:id - routes/painel-avaliacoes-finais.js): a ficha separada em parte
	// escrita e apresentação, com o total somado na hora. O servidor confere de novo notas, máximos e a
	// janela da avaliação; ao concluir, a nota vai sozinha pro ranking.
	angular
	.module('PDIAP')
	.controller('painelAvaliacaoFinalCtrl', function($scope, $rootScope, $state, $stateParams, $http, $mdToast) {

		if (!($rootScope.pessoaLogada && $rootScope.pessoaLogada.senhaDefinida)) {
			$state.go('painelTrocarSenha');
			return;
		}

		var base = '/api/painel/avaliacoes-finais/' + $stateParams.id;
		$scope.urlTexto = base + '/texto';
		$scope.carregando = true;
		$scope.erro = null;
		$scope.av = {};
		$scope.notas = [];
		$scope.form = { parecer: '' };
		$scope.salvando = false;
		var grupos = [];

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
				grupos = [];
				[['escrita', 'Parte escrita'], ['apresentacao', 'Apresentação']].forEach(function(p) {
					var indices = [];
					$scope.av.ficha.forEach(function(k, i) { if ((k.parte || 'apresentacao') === p[0]) indices.push(i); });
					if (indices.length) grupos.push({ rotulo: p[1], indices: indices, maximo: indices.reduce(function(s, i) { return s + $scope.av.ficha[i].maximo; }, 0) });
				});
				$scope.carregando = false;
			}, function(response) {
				$scope.erro = erroDe(response, 'Não foi possível abrir o trabalho.');
				$scope.carregando = false;
			});
		};
		carregar();

		$scope.partes = function() { return grupos; };
		$scope.virgula = function(n) { return n === null || n === undefined ? '' : String(n).replace('.', ','); };
		$scope.maximo = function() {
			return ($scope.av.ficha || []).reduce(function(s, k) { return s + k.maximo; }, 0);
		};
		// null enquanto faltar nota (ou alguma estiver fora do limite).
		var soma = function(indices) {
			var ficha = $scope.av.ficha || [], s = 0;
			for (var j = 0; j < indices.length; j++) {
				var i = indices[j], n = $scope.notas[i];
				if (n === null || n === undefined || n === '' || isNaN(n) || n < 0 || n > ficha[i].maximo) return null;
				s += Number(n);
			}
			return Math.round(s * 100) / 100;
		};
		$scope.subtotal = function(parte) { return soma(parte.indices); };
		$scope.total = function() { return soma(($scope.av.ficha || []).map(function(k, i) { return i; })); };

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
