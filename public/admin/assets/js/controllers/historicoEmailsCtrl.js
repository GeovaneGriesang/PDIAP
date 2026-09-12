(function(){
	'use strict';

	// Mostra o histórico de e-mails em massa (Projetos, Avaliação x2, Participantes - ver
	// _registrarHistoricoEmail em routes/admin.js, chamado nas 4 rotas de envio), por ano.
	angular
	.module('PDIAPa')
	.controller('historicoEmailsCtrl', function($scope, $rootScope, $mdDialog, adminAPI) {

		$scope.historico = [];
		$scope.year = CadastraAno();
		$rootScope.ano = $rootScope.ano || new Date().getFullYear();

		var ORIGEM_LABEL = {
			projetos: 'Projetos', premiados: 'Premiados', avaliadores: 'Avaliadores', participantes: 'Participantes'
		};
		$scope.origemLabel = function(origem) {
			return ORIGEM_LABEL[origem] || origem;
		};

		let carregarHistorico = function() {
			$scope.historico = [];
			adminAPI.getHistoricoEmails($rootScope.ano)
			.success(function(historico) {
				$scope.historico = historico;
			})
			.error(function(status) {
				console.log(status);
			});
		};
		carregarHistorico();

		$scope.recarregar = function() {
			carregarHistorico();
		};

		$scope.filtroOrigem = 'todos';
		$scope.query = 'assunto';
		$scope.setBusca = function(campo) {
			$scope.query = campo;
		};
		$scope.filtrarPorOrigem = function(item) {
			return $scope.filtroOrigem === 'todos' || item.origem === $scope.filtroOrigem;
		};

		$scope.verDetalhes = function(item, ev) {
			$mdDialog.show({
				targetEvent: ev,
				clickOutsideToClose: true,
				locals: { item: item },
				template:
					'<md-dialog aria-label="Detalhes do e-mail" style="max-width:700px;">' +
						'<md-dialog-content style="padding:24px;">' +
							'<h2 style="margin-top:0;">{{item.assunto}}</h2>' +
							'<p><b>Enviado em:</b> {{item.data | date:"dd/MM/yyyy HH:mm"}} por {{item.usuario}}</p>' +
							'<p><b>Origem:</b> {{origemLabel(item.origem)}}<span data-ng-if="item.destinatarioTipo"> — Destinatário: {{item.destinatarioTipo}}</span></p>' +
							'<p><b>Corpo:</b></p>' +
							'<p style="white-space:pre-wrap;background:#f7f7f7;padding:12px;border-radius:4px;">{{item.corpo}}</p>' +
							'<p><b>Destinatários ({{item.destinatarios.length}}):</b></p>' +
							'<p style="max-height:200px;overflow-y:auto;background:#f7f7f7;padding:12px;border-radius:4px;">{{item.destinatarios.join(", ")}}</p>' +
						'</md-dialog-content>' +
						'<md-dialog-actions layout="row">' +
							'<span flex></span>' +
							'<md-button data-ng-click="fechar()" class="md-primary">Fechar</md-button>' +
						'</md-dialog-actions>' +
					'</md-dialog>',
				controller: function($scope, $mdDialog) {
					$scope.item = item;
					$scope.origemLabel = function(o) { return ORIGEM_LABEL[o] || o; };
					$scope.fechar = function() { $mdDialog.hide(); };
				}
			});
		};
	});
})();
