(function(){
	'use strict';

	// Avaliação > Etapa prévia: configuração POR MOSTRA da avaliação dos textos antes do evento
	// (aprovação pra apresentação/anais) - prazos, convite x envio direto, nº de avaliadores por
	// trabalho, anonimato, se a nota conta na final e a ficha de cada categoria. Ver
	// controllers/avaliacao-previa-controller.js. A Mostra é a mesma das outras telas ($rootScope.mostraId).
	angular
	.module('PDIAPa')
	.controller('avaliacaoPreviaCtrl', function($scope, $rootScope, $timeout, $http) {

		$scope.mostras = [];
		$scope.config = null;
		$scope.resumo = {};
		$scope.salvando = false;

		// Datas: o banco guarda data+hora; a tela trabalha só com o dia (prazo = fim do dia).
		var paraDia = function(v) { if (!v) return null; var d = new Date(v); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
		var fimDoDia = function(d) { return d ? new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59) : null; };

		$scope.carregar = function() {
			$scope.config = null;
			if (!$rootScope.mostraId) return;
			$http.get('/admin/avaliacao-previa', { params: { mostraId: $rootScope.mostraId } }).then(function(response) {
				var c = response.data.config;
				c.envioInicio = paraDia(c.envioInicio);
				c.envioPrazo = paraDia(c.envioPrazo);
				c.prazoAvaliacao = paraDia(c.prazoAvaliacao);
				$scope.config = c;
				$scope.resumo = response.data.resumo;
				$scope.distribuicao = response.data.distribuicao || { situacoes: {}, faltando: [] };
				$scope.salvo = { envioPrazo: c.envioPrazo };
			}, function(response) {
				$scope.toast(typeof response.data === 'string' && response.data ? response.data : 'Não foi possível carregar.', 'failed-toast');
			});
		};
		$scope.recarregar = $scope.carregar;

		$scope.nomeMostra = function() {
			var m = $scope.mostras.filter(function(x) { return x._id === $rootScope.mostraId; })[0];
			return m ? m.ano + ' - ' + m.nome : '';
		};

		$http.get('/admin/mostraFeiras').then(function(response) {
			$scope.mostras = (response.data || []).filter(function(f) { return f.tipo === 'edicao'; })
				.sort(function(a, b) { return (b.ano - a.ano) || (String(a._id) < String(b._id) ? 1 : -1); });
			$timeout(function() {
				if (!$rootScope.mostraId && $scope.mostras.length) $rootScope.mostraId = $scope.mostras[0]._id;
				$scope.carregar();
			});
		});

		$scope.totalFicha = function(f) {
			return (f.criterios || []).reduce(function(s, k) { return s + (parseInt(k.maximo, 10) || 0); }, 0);
		};
		$scope.adicionarCriterio = function(f) {
			f.criterios.push({ nome: '', maximo: 10 });
		};
		$scope.removerCriterio = function(f, i) {
			f.criterios.splice(i, 1);
		};

		// Distribuição (usa a configuração já salva no servidor).
		$scope.distribuicao = { situacoes: {}, faltando: [] };
		$scope.distribuindo = false;
		$scope.envioAindaAberto = function() {
			var p = $scope.salvo && $scope.salvo.envioPrazo;
			return !!p && fimDoDia(p) > new Date();
		};
		$scope.distribuir = function() {
			$scope.distribuindo = true;
			$http.post('/admin/avaliacao-previa/distribuir', { mostraId: $rootScope.mostraId }).then(function(response) {
				var r = response.data;
				$scope.toast(r.novas + ' entrega(s) nova(s)' + (r.faltando.length ? '; ' + r.faltando.length + ' trabalho(s) sem avaliadores(as) suficientes.' : '.'), r.faltando.length ? 'failed-toast' : 'success-toast');
				$scope.carregar();
			}, function(response) {
				$scope.toast(typeof response.data === 'string' && response.data ? response.data : 'Falha ao distribuir.', 'failed-toast');
			}).finally(function() { $scope.distribuindo = false; });
		};
		$scope.pausar = function() {
			$scope.distribuindo = true;
			$http.post('/admin/avaliacao-previa/pausar', { mostraId: $rootScope.mostraId }).then(function() {
				$scope.toast('Distribuição automática pausada. O que já foi entregue continua valendo.', 'success-toast');
				$scope.carregar();
			}, function(response) {
				$scope.toast(typeof response.data === 'string' && response.data ? response.data : 'Falha ao pausar.', 'failed-toast');
			}).finally(function() { $scope.distribuindo = false; });
		};

		$scope.salvar = function() {
			var c = angular.copy($scope.config);
			c.envioInicio = c.envioInicio ? new Date(c.envioInicio.getFullYear(), c.envioInicio.getMonth(), c.envioInicio.getDate()) : null;
			c.envioPrazo = fimDoDia(c.envioPrazo);
			c.prazoAvaliacao = fimDoDia(c.prazoAvaliacao);
			c.fichas = c.fichas.map(function(f) { return { categoria: f.categoria, criterios: f.criterios }; });
			$scope.salvando = true;
			$http.put('/admin/avaliacao-previa', { mostraId: $rootScope.mostraId, config: c }).then(function() {
				$scope.toast('Etapa prévia da ' + $scope.nomeMostra() + ' salva.', 'success-toast');
				$scope.carregar();
			}, function(response) {
				$scope.toast(typeof response.data === 'string' && response.data ? response.data : 'Falha ao salvar.', 'failed-toast');
			}).finally(function() { $scope.salvando = false; });
		};
	});
})();
