(function(){
	'use strict';

	// Escolha de múltiplas combinações categoria+eixo temático (um avaliador pode se
	// inscrever pra avaliar mais de uma). Uso:
	// <div data-categoria-eixo-picker="avaliador.categoriasEixos" data-lista-categorias="listaCategorias"></div>
	// "listaCategorias" é o array já carregado pelo controller pai via getCategorias()
	// (mesmo formato de assets/js/categorias-eixos.json: [{categoria, eixos:[...]}]).
	angular
	.module('PDIAP')
	.directive('categoriaEixoPicker', function() {
		return {
			restrict: 'A',
			scope: {
				selecionados: '=categoriaEixoPicker',
				listaCategorias: '='
			},
			template:
				'<div layout="row">' +
					'<md-input-container class="md-block" flex-xs="100" flex="45">' +
						'<label>Categoria</label>' +
						'<md-select data-ng-model="novo.categoria" data-ng-change="selectEixos(novo.categoria)">' +
							'<md-option data-ng-value="x.categoria" data-ng-repeat="x in listaCategorias">{{x.categoria}}</md-option>' +
						'</md-select>' +
					'</md-input-container>' +
					'<div flex="5" hide-xs></div>' +
					'<md-input-container class="md-block" flex-xs="100" flex="45">' +
						'<label>Eixo Temático</label>' +
						'<md-select data-ng-model="novo.eixo" data-ng-disabled="!novo.categoria">' +
							'<md-option data-ng-value="y" data-ng-repeat="y in eixos">{{y}}</md-option>' +
						'</md-select>' +
					'</md-input-container>' +
				'</div>' +
				'<div layout="row" layout-align="end center" style="margin-bottom:10px;">' +
					'<p class="message-error" data-ng-if="duplicado" style="margin-right:auto;">Essa combinação já foi adicionada.</p>' +
					'<md-button class="md-raised" data-ng-disabled="!novo.categoria || !novo.eixo" data-ng-click="adicionar()">Adicionar</md-button>' +
				'</div>' +
				'<div class="categoria-eixo-chips">' +
					'<div class="categoria-eixo-chip" data-ng-repeat="ce in selecionados">' +
						'<span>{{ce.categoria}} - {{ce.eixo}}</span>' +
						'<md-icon md-svg-src="close" data-ng-click="remover($index)"></md-icon>' +
					'</div>' +
					'<p class="message-error" data-ng-if="selecionados.length === 0">Nenhuma categoria/eixo adicionada ainda.</p>' +
				'</div>',
			link: function(scope) {
				scope.novo = {};
				scope.eixos = [];
				scope.duplicado = false;
				if (!scope.selecionados) scope.selecionados = [];

				scope.selectEixos = function(categoria) {
					scope.novo.eixo = undefined;
					scope.eixos = [];
					angular.forEach(scope.listaCategorias, function(x) {
						if (x.categoria === categoria) scope.eixos = x.eixos;
					});
				};

				scope.adicionar = function() {
					var jaExiste = scope.selecionados.some(function(ce) {
						return ce.categoria === scope.novo.categoria && ce.eixo === scope.novo.eixo;
					});
					if (jaExiste) { scope.duplicado = true; return; }
					scope.duplicado = false;
					scope.selecionados.push({ categoria: scope.novo.categoria, eixo: scope.novo.eixo });
					scope.novo = {};
					scope.eixos = [];
				};

				scope.remover = function(index) {
					scope.selecionados.splice(index, 1);
				};
			}
		};
	});
})();
