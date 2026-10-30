(function(){
	'use strict';

	// Tela "Pessoas": busca no cadastro único e mostra os perfis da pessoa em cada Mostra
	// (derivados dos vínculos, nunca gravados - ver controllers/perfis-controller.js); a
	// organização também altera os dados da pessoa por aqui.
	angular
	.module('PDIAPa')
	.controller('pessoasCtrl', function($scope, $mdToast, $http, adminAPI) {

		$scope.toast = function(message,tema) {
			var toast = $mdToast.simple().textContent(message).action('✖').position('top right').theme(tema).hideDelay(10000);
			$mdToast.show(toast);
		};

		$scope.busca = { q: '' };
		$scope.resultados = [];
		$scope.buscou = false;
		$scope.perfil = null;

		var NACIONALIDADES = { brasileiro: 'Brasileiro(a)', paraguaio: 'Paraguaio(a)', uruguaio: 'Uruguaio(a)', venezuelano: 'Venezuelano(a)', outro: 'Outra nacionalidade' };
		$scope.nomeNacionalidade = function(n) { return NACIONALIDADES[n] || n || '-'; };

		$scope.pesquisar = function() {
			var q = ($scope.busca.q || '').trim();
			$scope.perfil = null;
			if (q.length < 3) { $scope.resultados = []; $scope.buscou = false; return; }
			adminAPI.pesquisarPessoas(q)
			.then(function(response) {
				$scope.resultados = response.data || [];
				$scope.buscou = true;
			}, function(response) {
				$scope.toast(response.data || 'Falha.','failed-toast');
			});
		};

		// Também aceita um documento digitado direto (pessoa antiga, ainda sem cadastro único,
		// só nos registros de projeto/avaliação).
		$scope.verPerfis = function(documento) {
			adminAPI.getPerfisPessoa(documento)
			.then(function(response) {
				$scope.perfil = response.data;
			}, function(response) {
				$scope.toast(response.data || 'Falha.','failed-toast');
			});
		};

		// Cadastro novo (POST /admin/pessoas - perfis-controller.js#criar).
		$scope.nova = null;
		$scope.abrirNova = function() { $scope.nova = { nacionalidade: 'brasileiro' }; };
		$scope.cancelarNova = function() { $scope.nova = null; };
		$scope.salvarNova = function() {
			$scope.salvando = true;
			$http.post('/admin/pessoas', $scope.nova)
			.then(function(response) {
				$scope.toast('Cadastro de ' + response.data.nome + ' criado.', 'success-toast');
				$scope.nova = null;
				$scope.busca.q = response.data.documento;
				$scope.pesquisar();
			}, function(response) {
				$scope.toast(typeof response.data === 'string' && response.data ? response.data : 'Falha ao cadastrar.', 'failed-toast');
			}).finally(function() { $scope.salvando = false; });
		};

		$scope.voltar = function() {
			$scope.perfil = null;
			$scope.edicao = null;
		};

		// Edição dos dados da pessoa (PUT /admin/pessoas/:id - perfis-controller.js#atualizarDados).
		$scope.NACIONALIDADES = NACIONALIDADES;
		$scope.edicao = null;
		$scope.salvando = false;
		$scope.normalizar = function(d) { return String(d || '').replace(/[^0-9a-zA-Z]/g, '').toUpperCase(); };
		$scope.editar = function() {
			var p = $scope.perfil.pessoa;
			$scope.edicao = {
				nome: p.nome || '', documento: $scope.perfil.documento, nacionalidade: p.nacionalidade, telefone: p.telefone || '',
				email: p.email || '', alternativos: (p.emailsAlternativos || []).slice(0, 2)
			};
		};
		$scope.cancelarEdicao = function() { $scope.edicao = null; };
		$scope.salvarEdicao = function() {
			var e = $scope.edicao;
			var dados = {
				nome: e.nome, documento: e.documento, telefone: e.telefone, email: e.email,
				emailsAlternativos: (e.alternativos || []).filter(function(x) { return x && x.trim(); })
			};
			if (e.nacionalidade) dados.nacionalidade = e.nacionalidade;
			$scope.salvando = true;
			$http.put('/admin/pessoas/' + $scope.perfil.pessoa._id, dados).then(function(response) {
				var r = response.data;
				$scope.toast(r.alterados.length ? 'Cadastro de ' + r.pessoa.nome + ' salvo.' : 'Nada foi alterado.', 'success-toast');
				$scope.edicao = null;
				$scope.verPerfis(r.pessoa.documento);
			}, function(response) {
				$scope.toast(typeof response.data === 'string' && response.data ? response.data : 'Falha ao salvar.', 'failed-toast');
			}).finally(function() { $scope.salvando = false; });
		};
	});
})();
