(function(){
	'use strict';

	// Cor de cada CATEGORIA nas listas de projetos (bolinha + legenda), tirada das categorias da
	// Mostra selecionada (Feira.categoriasEixos), na ordem cadastrada - antes eram 3 categorias
	// fixas no HTML e as de Mostras novas (ex: XI MOVACI: "Ensino Médio e Técnico", "Ensino
	// Superior") ficavam sem cor. As 3 primeiras cores são as de sempre (azul, roxo, verde).
	// Carregado nos dois apps do admin: PDIAPa (Mostra em $rootScope.mostraSelecionada) e PDIAPav
	// (avaliação/ranking, Mostra em $rootScope.mostraAtual).
	var PALETA = ['#3f51b5', '#9c27b0', '#4caf50', '#ff9800', '#00897b', '#e91e63', '#795548', '#607d8b'];
	var SEM_COR = '#bdbdbd';
	// Sem Mostra conhecida (ou categoria fora dela): as categorias antigas mantêm a cor de sempre.
	var ANTIGAS = {
		'Fundamental I (1º ao 5º anos)': PALETA[0],
		'Fundamental II (6º ao 9º anos)': PALETA[1],
		'Ensino Médio, Técnico e Superior': PALETA[2]
	};
	// Nome curto pra legenda (o "(1º ao 5º anos)" só ocupa espaço).
	var curto = function(nome) { return String(nome || '').replace(/\s*\([^)]*\)\s*$/, ''); };

	['PDIAPa', 'PDIAPav'].forEach(function(nomeModulo) {
		var modulo;
		try { modulo = angular.module(nomeModulo); } catch (e) { return; }
		modulo.run(function($rootScope) {
			var mostra = function() { return $rootScope.mostraSelecionada || $rootScope.mostraAtual || null; };
			var categoriasDa = function(m) {
				var vistas = [];
				((m && m.categoriasEixos) || []).forEach(function(c) {
					if (c && c.categoria && vistas.indexOf(c.categoria) === -1) vistas.push(c.categoria);
				});
				return vistas;
			};
			$rootScope.corCategoria = function(categoria) {
				var i = categoriasDa(mostra()).indexOf(categoria);
				if (i !== -1) return PALETA[i % PALETA.length];
				return ANTIGAS[categoria] || SEM_COR;
			};
			// Mesma lista (mesmo array) enquanto a Mostra não muda - ng-repeat sobre um array novo a
			// cada digest dispara $rootScope:infdig.
			var cache = { chave: null, lista: [] };
			$rootScope.legendaCategorias = function() {
				var m = mostra();
				var cats = categoriasDa(m);
				if (!cats.length) cats = Object.keys(ANTIGAS);
				var chave = cats.join('|');
				if (cache.chave !== chave) {
					cache = { chave: chave, lista: cats.map(function(c) { return { nome: curto(c), completo: c, cor: $rootScope.corCategoria(c) }; }) };
				}
				return cache.lista;
			};
		});
	});
})();
