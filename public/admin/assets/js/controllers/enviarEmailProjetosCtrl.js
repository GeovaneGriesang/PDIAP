(function(){
	'use strict';

	angular
	.module('PDIAPa')
	.controller('enviarEmailProjetosCtrl', function($scope, $rootScope, $mdDialog, adminAPI) {

		$scope.projetos = [];
		$scope.year = CadastraAno();
		$rootScope.ano = $rootScope.ano || new Date().getFullYear();

		let carregarProjetos = function() {
			$scope.projetos = [];
			adminAPI.getTodosProjetos()
			.success(function(projetos) {
				angular.forEach(projetos, function(value) {
					var ano = new Date(value.createdAt).getFullYear();
					if (ano == $rootScope.ano) {
						$scope.projetos.push({
							_id: value._id,
							numInscricao: value.numInscricao,
							nomeProjeto: value.nomeProjeto,
							nomeEscola: value.nomeEscola,
							categoria: value.categoria,
							eixo: value.eixo,
							estado: value.estado,
							cidade: value.cidade,
							email: value.email,
							integrantes: value.integrantes
						});
					}
				});
			})
			.error(function(status) {
				console.log(status);
			});
		};
		carregarProjetos();

		$scope.recarregar = function() {
			$scope.idsSelecionados = [];
			carregarProjetos();
		};

		$scope.query = 'nomeProjeto';
		$scope.setBusca = function(campo) {
			$scope.query = campo;
		};

		$scope.ordenacao = ['categoria', 'eixo'];
		$scope.ordenarPor = function(campo) {
			$scope.ordenacao = campo;
		};

		// Seleção de projetos (mesmo espírito de $scope.contador em projetosCtrl.js/aprovados.html,
		// só que aqui acumulando os projetos escolhidos como destinatários do email, não aprovados).
		$scope.idsSelecionados = [];
		$scope.contador = function(checked, id) {
			var idx = $scope.idsSelecionados.indexOf(id);
			if (checked && idx === -1) $scope.idsSelecionados.push(id);
			if (!checked && idx !== -1) $scope.idsSelecionados.splice(idx, 1);
		};
		$scope.selecionarTodosFiltrados = function(listaFiltrada) {
			angular.forEach($scope.projetos, function(p) { p.selecionado = false; });
			angular.forEach(listaFiltrada, function(p) { p.selecionado = true; });
			$scope.idsSelecionados = listaFiltrada.map(function(p) { return p._id; });
		};
		$scope.limparSelecao = function() {
			angular.forEach($scope.projetos, function(p) { p.selecionado = false; });
			$scope.idsSelecionados = [];
		};

		// Mesmo mecanismo de máscaras ¨chave usado nos textos de certificado (homeCtrl.js),
		// aqui só para a pré-visualização — o envio de verdade roda a mesma lógica no servidor.
		function _aplicaMascaras(texto, dados) {
			return (texto || '').replace(/¨\w+/g, function(match) {
				var chave = match.slice(1);
				return dados[chave] !== undefined && dados[chave] !== null ? String(dados[chave]) : match;
			});
		}

		$scope.previaAssunto = '';
		$scope.previaCorpo = '';
		$scope.gerarPreVisualizacao = function() {
			var projeto = $scope.projetos.filter(function(p) { return $scope.idsSelecionados.indexOf(p._id) !== -1; })[0];
			if (!projeto) return;
			var dados = {
				nome: projeto.nomeProjeto, nomeProjeto: projeto.nomeProjeto, categoria: projeto.categoria,
				eixo: projeto.eixo, numInscricao: projeto.numInscricao, nomeEscola: projeto.nomeEscola,
				estado: projeto.estado, cidade: projeto.cidade
			};
			$scope.previaAssunto = _aplicaMascaras($scope.assunto, dados);
			$scope.previaCorpo = _aplicaMascaras($scope.corpo, dados);
		};

		$scope.enviar = function(ev) {
			var confirm = $mdDialog.confirm()
				.title('Enviar e-mail?')
				.textContent('Isso vai enviar o e-mail para os destinatários (' + $scope.destinatario + ') dos ' + $scope.idsSelecionados.length + ' projeto(s) selecionado(s). Essa ação não pode ser desfeita.')
				.targetEvent(ev)
				.ok('Enviar')
				.cancel('Cancelar');
			$mdDialog.show(confirm).then(function() {
				adminAPI.postEnviarEmailProjetos({
					idsProjetos: $scope.idsSelecionados,
					destinatario: $scope.destinatario,
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
