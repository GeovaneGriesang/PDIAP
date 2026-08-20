(function(){
	'use strict';

	angular
	.module('PDIAPa')
	.controller('enviarEmailParticipantesCtrl', function($scope, $rootScope, $mdDialog, adminAPI) {

		$scope.participantes = [];
		$scope.year = CadastraAno();
		$rootScope.ano = $rootScope.ano || new Date().getFullYear();

		let carregarParticipantes = function() {
			$scope.participantes = [];
			adminAPI.getParticipantes()
			.success(function(participantes) {
				angular.forEach(participantes, function(value) {
					var ano = new Date(value.createdAt).getFullYear();
					if (ano == $rootScope.ano) {
						$scope.participantes.push({
							_id: value._id,
							nome: value.nome,
							email: value.email
						});
					}
				});
			})
			.error(function(status) {
				console.log(status);
			});
		};
		carregarParticipantes();

		$scope.recarregar = function() {
			$scope.idsSelecionados = [];
			carregarParticipantes();
		};

		$scope.query = 'nome';
		$scope.setBusca = function(campo) {
			$scope.query = campo;
		};

		$scope.ordenacao = ['nome'];
		$scope.ordenarPor = function(campo) {
			$scope.ordenacao = campo;
		};

		// Seleção de participantes como destinatários (mesmo espírito de enviarEmailAvaliadoresCtrl.js).
		$scope.idsSelecionados = [];
		$scope.contador = function(checked, id) {
			var idx = $scope.idsSelecionados.indexOf(id);
			if (checked && idx === -1) $scope.idsSelecionados.push(id);
			if (!checked && idx !== -1) $scope.idsSelecionados.splice(idx, 1);
		};
		$scope.selecionarTodosFiltrados = function(listaFiltrada) {
			angular.forEach($scope.participantes, function(p) { p.selecionado = false; });
			angular.forEach(listaFiltrada, function(p) { p.selecionado = true; });
			$scope.idsSelecionados = listaFiltrada.map(function(p) { return p._id; });
		};
		$scope.limparSelecao = function() {
			angular.forEach($scope.participantes, function(p) { p.selecionado = false; });
			$scope.idsSelecionados = [];
		};

		// Máscaras disponíveis pra essa tela (ver diretiva mascarasLegenda.js). Participantes
		// só têm nome/e-mail cadastrados hoje - só quem tem e-mail preenchido entra no envio.
		$scope.mascarasDisponiveis = [
			{chave:'nome', desc:'Nome do participante'},
			{chave:'email', desc:'E-mail do participante'}
		];

		function _aplicaMascaras(texto, dados) {
			return (texto || '').replace(/¨\w+/g, function(match) {
				var chave = match.slice(1);
				return dados[chave] !== undefined && dados[chave] !== null ? String(dados[chave]) : match;
			});
		}

		$scope.previaAssunto = '';
		$scope.previaCorpo = '';
		$scope.gerarPreVisualizacao = function() {
			var participante = $scope.participantes.filter(function(p) { return $scope.idsSelecionados.indexOf(p._id) !== -1; })[0];
			if (!participante) return;
			$scope.previaAssunto = _aplicaMascaras($scope.assunto, participante);
			$scope.previaCorpo = _aplicaMascaras($scope.corpo, participante);
		};

		$scope.enviar = function(ev) {
			var confirm = $mdDialog.confirm()
				.title('Enviar e-mail?')
				.textContent('Isso vai enviar o e-mail pros ' + $scope.idsSelecionados.length + ' participante(s) selecionado(s) que tiverem e-mail cadastrado. Essa ação não pode ser desfeita.')
				.targetEvent(ev)
				.ok('Enviar')
				.cancel('Cancelar');
			$mdDialog.show(confirm).then(function() {
				adminAPI.postEnviarEmailParticipantes({
					idsParticipantes: $scope.idsSelecionados,
					assunto: $scope.assunto,
					corpo: $scope.corpo
				})
				.success(function(data) {
					$scope.toast('E-mail sendo enviado para ' + data.total + ' destinatário(s)!', 'success-toast');
				})
				.error(function(status) {
					$scope.toast('Falha ao enviar. ' + status, 'failed-toast');
				});
			}, function() {});
		};
	});
})();
