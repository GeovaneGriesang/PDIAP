(function(){
	'use strict';

	angular
	.module('PDIAP')
	.controller('avaliadorDadosCtrl', function($scope, $mdToast, avaliadorAPI) {

		$scope.avaliador = {};

		avaliadorAPI.getDados()
		.then(function(response) {
			$scope.avaliador = response.data;
		}, function(response) {
			console.log('Error: ' + response.data);
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
				atuacaoProfissional: avaliador.atuacaoProfissional,
				tempoAtuacao: avaliador.tempoAtuacao,
				curriculo: avaliador.curriculo
			};
			avaliadorAPI.putDados(dados)
			.then(function() {
				$scope.toast('Dados atualizados com sucesso!', 'success-toast');
			}, function() {
				$scope.toast('Falha ao salvar.', 'failed-toast');
			});
		};
	});
})();
