(function(){
	'use strict';

	// Formulário público standalone de solicitação de escola nova - segundo ponto de
	// entrada além do fluxo inline no cadastro de projeto (ver registroCtrl.js), pra
	// quando alguém quer garantir que a escola já está cadastrada antes mesmo de
	// inscrever um projeto. Acessado pelo botão "Cadastrar minha escola" (configurável
	// em editar-tela-inicial.html), quando habilitado.
	angular
	.module('PDIAP')
	.controller('solicitarEscolaCtrl', function($scope, projetosAPI) {

		$scope.escola = {};
		$scope.listaEstados = [];
		$scope.cidades = [];
		$scope.enviado = false;
		$scope.erro = false;

		projetosAPI.getEstados()
		.success(function(data) {
			$scope.listaEstados = data.estados;
		})
		.error(function(status) {
			console.log('Erro estados: '+status);
		});

		$scope.selectCidades = function(cid) {
			$scope.cidades = [];
			angular.forEach($scope.listaEstados, function(value) {
				if (cid === value.nome) {
					angular.forEach(value.cidades, function(c) { $scope.cidades.push(c); });
				}
			});
		};

		$scope.enviarSolicitacao = function(escola) {
			$scope.erro = false;
			escola.origem = 'formulario_publico';
			projetosAPI.solicitarEscola(escola)
			.success(function() {
				$scope.enviado = true;
			})
			.error(function(status) {
				$scope.erro = true;
				console.log('Erro ao solicitar escola: '+status);
			});
		};
	});
})();
