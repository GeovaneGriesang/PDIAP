(function(){
	'use strict';

	angular
	.module('PDIAP')
	.controller('avaliadorDadosCtrl', function($scope, $mdToast, avaliadorAPI) {

		$scope.avaliador = {};

		avaliadorAPI.getDados()
		.success(function(avaliador) {
			$scope.avaliador = avaliador;
		})
		.error(function(status) {
			console.log('Error: ' + status);
		});

		$scope.toast = function(message, tema) {
			var toast = $mdToast.simple().textContent(message).action('✖').position('top right').theme(tema).hideDelay(6000);
			$mdToast.show(toast);
		};

		// Só os campos abaixo são editáveis por aqui - nome/e-mail/documento/nacionalidade
		// são de identidade e continuam só editáveis pelo admin.
		$scope.salvar = function(avaliador) {
			var dados = {
				telefone: avaliador.telefone,
				nivelAcademico: avaliador.nivelAcademico,
				categoria: avaliador.categoria,
				eixo: avaliador.eixo,
				atuacaoProfissional: avaliador.atuacaoProfissional,
				tempoAtuacao: avaliador.tempoAtuacao,
				curriculo: avaliador.curriculo
			};
			avaliadorAPI.putDados(dados)
			.success(function() {
				$scope.toast('Dados atualizados com sucesso!', 'success-toast');
			})
			.error(function(status) {
				$scope.toast('Falha ao salvar.', 'failed-toast');
			});
		};
	});
})();
