(function(){
	'use strict';

	angular
	.module('PDIAPa')
	.controller('enviarEmailAvaliadoresCtrl', function($scope, $rootScope, $mdDialog, adminAPI) {

		$scope.avaliadores = [];
		$scope.year = CadastraAno();
		$rootScope.ano = $rootScope.ano || new Date().getFullYear();

		let carregarAvaliadores = function() {
			$scope.avaliadores = [];
			adminAPI.getAvaliadores()
			.success(function(avaliadores) {
				angular.forEach(avaliadores, function(value) {
					var ano = new Date(value.createdAt).getFullYear();
					if (ano == $rootScope.ano) {
						$scope.avaliadores.push({
							_id: value._id,
							nome: value.nome,
							email: value.email,
							categorias: (value.categoriasEixos || []).map(function(ce) { return ce.categoria + ' - ' + ce.eixo; }).join('; '),
							nivelAcademico: value.nivelAcademico
						});
					}
				});
			})
			.error(function(status) {
				console.log(status);
			});
		};
		carregarAvaliadores();

		$scope.recarregar = function() {
			$scope.idsSelecionados = [];
			carregarAvaliadores();
		};

		$scope.query = 'nome';
		$scope.setBusca = function(campo) {
			$scope.query = campo;
		};

		$scope.ordenacao = ['nome'];
		$scope.ordenarPor = function(campo) {
			$scope.ordenacao = campo;
		};

		// Seleção de avaliadores como destinatários (mesmo espírito de enviarEmailProjetosCtrl.js).
		$scope.idsSelecionados = [];
		$scope.contador = function(checked, id) {
			var idx = $scope.idsSelecionados.indexOf(id);
			if (checked && idx === -1) $scope.idsSelecionados.push(id);
			if (!checked && idx !== -1) $scope.idsSelecionados.splice(idx, 1);
		};
		$scope.selecionarTodosFiltrados = function(listaFiltrada) {
			angular.forEach($scope.avaliadores, function(a) { a.selecionado = false; });
			angular.forEach(listaFiltrada, function(a) { a.selecionado = true; });
			$scope.idsSelecionados = listaFiltrada.map(function(a) { return a._id; });
		};
		$scope.limparSelecao = function() {
			angular.forEach($scope.avaliadores, function(a) { a.selecionado = false; });
			$scope.idsSelecionados = [];
		};

		// Máscaras disponíveis pra essa tela (ver diretiva mascarasLegenda.js) - "nome do
		// avaliador" é a mais pedida, mas dá pra usar qualquer campo do avaliador abaixo.
		$scope.mascarasDisponiveis = [
			{chave:'nome', desc:'Nome do avaliador'},
			{chave:'email', desc:'E-mail do avaliador'},
			{chave:'categorias', desc:'Categorias e eixos em que se inscreveu pra avaliar'},
			{chave:'nivelAcademico', desc:'Nível acadêmico do avaliador'}
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
			var avaliador = $scope.avaliadores.filter(function(a) { return $scope.idsSelecionados.indexOf(a._id) !== -1; })[0];
			if (!avaliador) return;
			$scope.previaAssunto = _aplicaMascaras($scope.assunto, avaliador);
			$scope.previaCorpo = _aplicaMascaras($scope.corpo, avaliador);
		};

		$scope.enviar = function(ev) {
			var confirm = $mdDialog.confirm()
				.title('Enviar e-mail?')
				.textContent('Isso vai enviar o e-mail pros ' + $scope.idsSelecionados.length + ' avaliador(es) selecionado(s). Essa ação não pode ser desfeita.')
				.targetEvent(ev)
				.ok('Enviar')
				.cancel('Cancelar');
			$mdDialog.show(confirm).then(function() {
				adminAPI.postEnviarEmailAvaliadores({
					idsAvaliadores: $scope.idsSelecionados,
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
