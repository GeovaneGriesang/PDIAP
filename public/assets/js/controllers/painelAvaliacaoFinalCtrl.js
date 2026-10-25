(function(){
	'use strict';

	// Avaliação no evento de um trabalho no "Meu painel" (painel-avaliacao-final.html,
	// /painel/avaliacao-evento/:id - routes/painel-avaliacoes-finais.js): a ficha separada em parte
	// escrita e apresentação, com o total somado na hora. O servidor confere de novo notas, máximos e a
	// janela da avaliação; ao concluir, a nota vai sozinha pro ranking.
	//
	// Sem internet (avaliacaoOfflineService.js): abre a ficha guardada no aparelho, o que é digitado
	// fica gravado no aparelho a cada mudança, e salvar/concluir entra na fila de envio - sai sozinho
	// quando a conexão voltar.
	angular
	.module('PDIAP')
	.controller('painelAvaliacaoFinalCtrl', function($scope, $rootScope, $state, $stateParams, $http, $mdToast, avaliacaoOffline) {

		if (!($rootScope.pessoaLogada && $rootScope.pessoaLogada.senhaDefinida)) {
			$state.go('painelTrocarSenha');
			return;
		}

		var id = $stateParams.id;
		var base = '/api/painel/avaliacoes-finais/' + id;
		$scope.urlTexto = base + '/texto';
		$scope.urlRelatorio = base + '/relatorio';
		$scope.carregando = true;
		$scope.erro = null;
		$scope.av = {};
		$scope.notas = [];
		$scope.form = { parecer: '' };
		$scope.salvando = false;
		$scope.semInternet = false;
		var grupos = [];

		$scope.toast = function(message, tema) {
			$mdToast.show($mdToast.simple().textContent(message).action('✖').position('top right').theme(tema).hideDelay(6000));
		};
		var erroDe = function(response, padrao) {
			return typeof response.data === 'string' && response.data ? response.data : padrao;
		};

		// Sem internet, a janela da avaliação é conferida aqui, pelas datas guardadas (o servidor confere
		// de novo no envio).
		var abertaAgora = function(av) {
			var agora = new Date();
			if (av.abreEm && agora < new Date(av.abreEm)) return false;
			if (av.fechaEm && agora > new Date(av.fechaEm)) return false;
			return true;
		};

		var mostrar = function(av) {
			$scope.av = av;
			// O mais recente vale: o que está na fila do aparelho, ou o que foi digitado e não salvo.
			var fila = avaliacaoOffline.naFila(id), digitado = avaliacaoOffline.digitado(id);
			var notas = av.notas, parecer = av.parecer;
			if (fila) { notas = fila.notas; parecer = fila.parecer; }
			if (digitado && (!av.salvoEm || new Date(digitado.em) > new Date(av.salvoEm)) && (!fila || new Date(digitado.em) > new Date(fila.avaliadoEm))) {
				notas = digitado.notas; parecer = digitado.parecer;
			}
			$scope.notas = av.ficha.map(function(k, i) {
				var n = (notas || [])[i];
				return n === null || n === undefined ? null : n;
			});
			$scope.form.parecer = parecer || '';
			grupos = [];
			[['escrita', 'Parte escrita'], ['apresentacao', 'Apresentação']].forEach(function(p) {
				var indices = [];
				av.ficha.forEach(function(k, i) { if ((k.parte || 'apresentacao') === p[0]) indices.push(i); });
				if (indices.length) grupos.push({ rotulo: p[1], indices: indices, maximo: indices.reduce(function(s, i) { return s + av.ficha[i].maximo; }, 0) });
			});
			$scope.carregando = false;
		};

		var carregar = function() {
			$http.get(base).then(function(response) {
				$scope.semInternet = false;
				avaliacaoOffline.guardarFicha(id, response.data);
				mostrar(response.data);
			}, function(response) {
				var guardada = avaliacaoOffline.semRede(response) ? avaliacaoOffline.ficha(id) : null;
				if (guardada) {
					$scope.semInternet = true;
					guardada.aberta = abertaAgora(guardada);
					mostrar(guardada);
					return;
				}
				$scope.erro = avaliacaoOffline.semRede(response)
					? 'Sem conexão com a internet, e este trabalho ainda não foi aberto neste aparelho. Abra o Meu painel com internet uma vez para ele ficar guardado aqui.'
					: erroDe(response, 'Não foi possível abrir o trabalho.');
				$scope.carregando = false;
			});
		};
		carregar();

		// Cada nota digitada já fica gravada no aparelho.
		$scope.$watch(function() { return [$scope.notas, $scope.form.parecer]; }, function(novo, antigo) {
			if ($scope.carregando || novo === antigo || !$scope.av.ficha) return;
			avaliacaoOffline.guardarDigitado(id, $scope.notas, $scope.form.parecer);
		}, true);

		// Lida do aparelho só quando a fila muda (a cada digest daria objeto novo: $rootScope:infdig).
		var itemNaFila = avaliacaoOffline.naFila(id);
		$scope.$on('avaliacaoOffline:mudou', function() { itemNaFila = avaliacaoOffline.naFila(id); });
		$scope.naFila = function() { return itemNaFila; };
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
			var notas = angular.copy($scope.notas), parecer = $scope.form.parecer;
			$http.put(base, { notas: notas, parecer: parecer, concluir: concluir }).then(function() {
				avaliacaoOffline.tirarDaFila(id);
				avaliacaoOffline.esquecerDigitado(id);
				$scope.toast(concluir ? 'Avaliação concluída. Obrigado(a)!' : 'Rascunho guardado.', 'success-toast');
				if (concluir) $state.go('painel'); else carregar();
			}, function(response) {
				if (!avaliacaoOffline.semRede(response)) {
					$scope.toast(erroDe(response, 'Não foi possível salvar.'), 'failed-toast');
					return;
				}
				// Sem internet: guarda no aparelho e envia quando a conexão voltar.
				avaliacaoOffline.enfileirar(id, { notas: notas, parecer: parecer, concluir: concluir, avaliadoEm: new Date().toISOString() });
				avaliacaoOffline.esquecerDigitado(id);
				$scope.semInternet = true;
				$scope.toast('Sem internet: ' + (concluir ? 'avaliação concluída' : 'rascunho') + ' guardado(a) neste aparelho. Será enviado(a) sozinho(a) quando a conexão voltar.', 'success-toast');
				if (concluir) $state.go('painel');
			}).finally(function() { $scope.salvando = false; });
		};
	});
})();
