(function(){
	'use strict';

	// Escolha de múltiplos dia+turno em que o avaliador pode avaliar. Uso:
	// <div data-dia-turno-picker="avaliadores.disponibilidade" data-lista-dias="listaDias"></div>
	// "listaDias" é o array já carregado pelo controller pai (diasAvaliacao da feira
	// tipo:'edicao' corrente, ver models/feira-schema.js): [{data, turnos:[...]}].
	// Mesma estrutura de public/assets/js/directives/categoriaEixoPicker.js, trocando
	// categoria/eixo por dia/turno.
	angular
	.module('PDIAPa')
	.directive('diaTurnoPicker', function() {
		return {
			restrict: 'A',
			scope: {
				selecionados: '=diaTurnoPicker',
				listaDias: '='
			},
			template:
				'<div layout="row">' +
					'<md-input-container class="md-block" flex-xs="100" flex="45">' +
						'<label>Dia</label>' +
						'<md-select data-ng-model="novo.data" data-ng-change="selectTurnos(novo.data)">' +
							'<md-option data-ng-value="x.data" data-ng-repeat="x in listaDias">{{x.data}}</md-option>' +
						'</md-select>' +
					'</md-input-container>' +
					'<div flex="5" hide-xs></div>' +
					'<md-input-container class="md-block" flex-xs="100" flex="45">' +
						'<label>Turno</label>' +
						'<md-select data-ng-model="novo.turno" data-ng-disabled="!novo.data">' +
							'<md-option data-ng-value="y" data-ng-repeat="y in turnos">{{y}}</md-option>' +
						'</md-select>' +
					'</md-input-container>' +
				'</div>' +
				'<div layout="row" layout-align="end center" style="margin-bottom:10px;">' +
					'<p class="message-error" data-ng-if="duplicado" style="margin-right:auto;">Esse dia/turno já foi adicionado.</p>' +
					'<md-button class="md-raised" data-ng-disabled="!novo.data || !novo.turno" data-ng-click="adicionar()">Adicionar</md-button>' +
				'</div>' +
				'<div class="categoria-eixo-chips">' +
					'<div class="categoria-eixo-chip" data-ng-repeat="dt in selecionados">' +
						'<span>{{dt.data}} - {{dt.turno}}</span>' +
						'<md-icon md-svg-src="close" data-ng-click="remover($index)"></md-icon>' +
					'</div>' +
					'<p class="message-error" data-ng-if="selecionados.length === 0">Nenhum dia/turno adicionado ainda.</p>' +
				'</div>',
			link: function(scope) {
				scope.novo = {};
				scope.turnos = [];
				scope.duplicado = false;
				if (!scope.selecionados) scope.selecionados = [];

				scope.selectTurnos = function(data) {
					scope.novo.turno = undefined;
					scope.turnos = [];
					angular.forEach(scope.listaDias, function(x) {
						if (x.data === data) scope.turnos = x.turnos;
					});
				};

				scope.adicionar = function() {
					var jaExiste = scope.selecionados.some(function(dt) {
						return dt.data === scope.novo.data && dt.turno === scope.novo.turno;
					});
					if (jaExiste) { scope.duplicado = true; return; }
					scope.duplicado = false;
					scope.selecionados.push({ data: scope.novo.data, turno: scope.novo.turno });
					scope.novo = {};
					scope.turnos = [];
				};

				scope.remover = function(index) {
					scope.selecionados.splice(index, 1);
				};
			}
		};
	});
})();
