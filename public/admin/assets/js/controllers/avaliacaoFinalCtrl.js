(function(){
	'use strict';

	// Avaliação > Banca: configuração POR MOSTRA da avaliação final pelo sistema (janela das
	// notas, quem entra na distribuição, ficha da apresentação por categoria/eixo) e a distribuição dos
	// trabalhos aprovados. Ver controllers/avaliacao-final-controller.js. A Mostra é a mesma das outras
	// telas ($rootScope.mostraId).
	angular
	.module('PDIAPa')
	.controller('avaliacaoFinalCtrl', function($scope, $rootScope, $timeout, $http, $mdDialog) {

		$scope.mostras = [];
		$scope.config = null;
		$scope.distribuicao = { situacoes: {}, faltando: [] };
		$scope.salvando = false;
		$scope.distribuindo = false;
		$scope.novaFicha = { chave: null };

		// Datas: o banco guarda data+hora; a tela trabalha só com o dia (fecha = fim do dia).
		var paraDia = function(v) { if (!v) return null; var d = new Date(v); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
		var fimDoDia = function(d) { return d ? new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59) : null; };
		var erroDe = function(response, padrao) {
			return typeof response.data === 'string' && response.data ? response.data : padrao;
		};

		$scope.carregar = function() {
			$scope.config = null;
			if (!$rootScope.mostraId) return;
			$http.get('/admin/avaliacao-final', { params: { mostraId: $rootScope.mostraId } }).then(function(response) {
				var c = response.data.config;
				c.abreEm = paraDia(c.abreEm);
				c.fechaEm = paraDia(c.fechaEm);
				$scope.config = c;
				$scope.publicadaSalva = !!c.publicarFichas;
				atualizarEixosLivres();
				$scope.distribuicao = response.data.distribuicao || { situacoes: {}, faltando: [] };
			}, function(response) {
				$scope.toast(erroDe(response, 'Não foi possível carregar.'), 'failed-toast');
			});
		};
		$scope.recarregar = $scope.carregar;

		$scope.nomeMostra = function() {
			var m = $scope.mostras.filter(function(x) { return x._id === $rootScope.mostraId; })[0];
			return m ? m.ano + ' - ' + m.nome : '';
		};
		$scope.nomeMostraCurto = function() {
			var m = $scope.mostras.filter(function(x) { return x._id === $rootScope.mostraId; })[0];
			return m ? m.nome : '';
		};

		$http.get('/admin/mostraFeiras').then(function(response) {
			$scope.mostras = (response.data || []).filter(function(f) { return f.tipo === 'edicao'; })
				.sort(function(a, b) { return (b.ano - a.ano) || (String(a._id) < String(b._id) ? 1 : -1); });
			$timeout(function() {
				if (!$rootScope.mostraId && $scope.mostras.length) $rootScope.mostraId = $scope.mostras[0]._id;
				$scope.carregar();
			});
		});

		// --- fichas ---
		$scope.totalFicha = function(f) {
			return (f.criterios || []).reduce(function(s, k) { return s + (parseInt(k.maximo, 10) || 0); }, 0);
		};
		$scope.adicionarCriterio = function(f) { f.criterios.push({ nome: '', maximo: 10 }); };
		$scope.removerCriterio = function(f, i) { f.criterios.splice(i, 1); };
		// Eixos das categorias da Mostra que ainda não têm ficha própria. Lista guardada (refeita só
		// quando as fichas mudam): montada a cada digest, o md-select recriava as opções sem parar
		// ($rootScope:infdig).
		$scope.eixosLivres = [];
		var atualizarEixosLivres = function() {
			var lista = [];
			(($scope.config && $scope.config.eixosPorCategoria) || []).forEach(function(c) {
				(c.eixos || []).forEach(function(eixo) {
					var tem = $scope.config.fichas.some(function(f) { return f.categoria === c.categoria && f.eixo === eixo; });
					if (!tem) lista.push({ chave: c.categoria + '||' + eixo, categoria: c.categoria, eixo: eixo });
				});
			});
			$scope.eixosLivres = lista;
		};
		$scope.adicionarFichaEixo = function() {
			var o = $scope.eixosLivres.filter(function(x) { return x.chave === $scope.novaFicha.chave; })[0];
			if (!o) return;
			// Começa como cópia da ficha da categoria.
			var base = $scope.config.fichas.filter(function(f) { return f.categoria === o.categoria && !f.eixo; })[0];
			var nova = { categoria: o.categoria, eixo: o.eixo, criterios: angular.copy(base ? base.criterios : []), padrao: false };
			var depois = 0;
			$scope.config.fichas.forEach(function(f, i) { if (f.categoria === o.categoria) depois = i + 1; });
			$scope.config.fichas.splice(depois, 0, nova);
			$scope.novaFicha.chave = null;
			atualizarEixosLivres();
		};
		$scope.removerFicha = function(i) {
			$scope.config.fichas.splice(i, 1);
			atualizarEixosLivres();
		};

		$scope.salvar = function() {
			var c = angular.copy($scope.config);
			c.abreEm = c.abreEm ? new Date(c.abreEm.getFullYear(), c.abreEm.getMonth(), c.abreEm.getDate()) : null;
			c.fechaEm = fimDoDia(c.fechaEm);
			c.fichas = c.fichas.map(function(f) { return { categoria: f.categoria, eixo: f.eixo || '', criterios: f.criterios }; });
			$scope.salvando = true;
			$http.put('/admin/avaliacao-final', { mostraId: $rootScope.mostraId, config: c }).then(function() {
				$scope.toast('Avaliação no evento da ' + $scope.nomeMostra() + ' salva.', 'success-toast');
				$scope.carregar();
			}, function(response) {
				$scope.toast(erroDe(response, 'Falha ao salvar.'), 'failed-toast');
			}).finally(function() { $scope.salvando = false; });
		};

		// --- distribuição (usa a configuração já salva no servidor) ---
		$scope.distribuir = function() {
			$scope.distribuindo = true;
			$http.post('/admin/avaliacao-final/distribuir', { mostraId: $rootScope.mostraId }).then(function(response) {
				var r = response.data;
				$scope.toast(r.novas + ' entrega(s) nova(s)' + (r.faltando.length ? '; ' + r.faltando.length + ' trabalho(s) sem avaliadores(as) suficientes.' : '.'), r.faltando.length ? 'failed-toast' : 'success-toast');
				$scope.carregar();
			}, function(response) {
				$scope.toast(erroDe(response, 'Falha ao distribuir.'), 'failed-toast');
			}).finally(function() { $scope.distribuindo = false; });
		};
		$scope.avisar = function(ev) {
			$mdDialog.show($mdDialog.confirm().title('Avisar por e-mail?')
				.textContent('Cada pessoa que recebeu trabalho e ainda não foi avisada recebe um e-mail com a lista dos trabalhos dela. Quem já foi avisado(a) só recebe de novo se ganhar trabalho novo.')
				.ariaLabel('Avisar').targetEvent(ev).ok('Enviar').cancel('Voltar')).then(function() {
				$scope.distribuindo = true;
				$http.post('/admin/avaliacao-final/avisar', { mostraId: $rootScope.mostraId }).then(function(response) {
					$scope.toast(response.data.avisadas + ' pessoa(s) avisada(s) por e-mail.', 'success-toast');
					$scope.carregar();
				}, function(response) {
					$scope.toast(erroDe(response, 'Falha ao avisar.'), 'failed-toast');
				}).finally(function() { $scope.distribuindo = false; });
			}, function() {});
		};
	});
})();
