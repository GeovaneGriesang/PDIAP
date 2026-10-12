(function(){
	'use strict';

	// Administradores por Mostra (só super-admin, ver utils/perfil.js): quem tem o acesso do admin
	// restrito a cada edição. A pessoa precisa estar no cadastro único (busca por nome, documento
	// ou e-mail - mesma busca da tela Pessoas).
	angular
	.module('PDIAPa')
	.controller('administradoresCtrl', function($scope, $http, $mdDialog) {

		$scope.mostras = [];
		$scope.busca = {};      // por Mostra: { termo, resultados, buscando }

		var motivo = function(response, padrao) {
			return typeof response.data === 'string' && response.data ? response.data : padrao;
		};

		$scope.carregar = function() {
			$http.get('/admin/administradores').then(function(response) {
				$scope.mostras = response.data || [];
				$scope.mostras.forEach(function(m) { if (!$scope.busca[m._id]) $scope.busca[m._id] = { termo: '', resultados: [] }; });
			}, function(response) {
				$scope.toast(motivo(response, 'Não foi possível carregar os administradores.'), 'failed-toast');
			});
		};
		$scope.carregar();

		$scope.pesquisar = function(mostra) {
			var b = $scope.busca[mostra._id];
			if (!b.termo || b.termo.trim().length < 3) { b.resultados = []; return; }
			b.buscando = true;
			$http.get('/admin/pessoas/pesquisar', { params: { q: b.termo } }).then(function(response) {
				var atuais = (mostra.administradores || []).map(function(a) { return a._id; });
				b.resultados = (response.data || []).filter(function(p) { return atuais.indexOf(p._id) === -1; });
				b.nenhum = !b.resultados.length;
			}, function(response) {
				$scope.toast(motivo(response, 'Falha na busca.'), 'failed-toast');
			}).finally(function() { b.buscando = false; });
		};

		$scope.incluir = function(mostra, pessoa) {
			$http.post('/admin/administradores', { mostraId: mostra._id, pessoaId: pessoa._id }).then(function() {
				$scope.toast(pessoa.nome + ' agora administra a ' + mostra.nome + '.', 'success-toast');
				$scope.busca[mostra._id] = { termo: '', resultados: [] };
				$scope.carregar();
			}, function(response) {
				$scope.toast(motivo(response, 'Não foi possível incluir.'), 'failed-toast');
			});
		};

		$scope.remover = function(mostra, pessoa, ev) {
			var confirm = $mdDialog.confirm()
				.title('Remover administrador(a)?')
				.textContent(pessoa.nome + ' deixa de administrar a ' + mostra.nome + '.')
				.targetEvent(ev).ok('Remover').cancel('Cancelar');
			$mdDialog.show(confirm).then(function() {
				$http.post('/admin/administradores/remover', { mostraId: mostra._id, pessoaId: pessoa._id }).then(function() {
					$scope.toast(pessoa.nome + ' removido(a) da ' + mostra.nome + '.', 'success-toast');
					$scope.carregar();
				}, function(response) {
					$scope.toast(motivo(response, 'Não foi possível remover.'), 'failed-toast');
				});
			}, function() {});
		};
	});
})();
