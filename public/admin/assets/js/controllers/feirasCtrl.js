(function(){
	'use strict';

	angular
	.module('PDIAPa')
	.controller('feirasCtrl', function($scope, $mdDialog, $mdToast, adminAPI) {

		$scope.toast = function(message,tema) {
			var toast = $mdToast.simple().textContent(message).action('✖').position('top right').theme(tema).hideDelay(10000);
			$mdToast.show(toast);
		};

		$scope.feiras = [];
		$scope.ano = new Date().getFullYear();
		$scope.year = CadastraAno();

		// Máscaras disponíveis pro texto de certificado de classificação (ver
		// homeCtrl.js#emitirCertificado1, tipo 'Feira'). Só se aplica a tipo:'classificacao'.
		$scope.mascarasDisponiveis = [
			{chave:'nome', desc:'Nome do integrante'},
			{chave:'nomeProjeto', desc:'Nome do projeto'},
			{chave:'categoria', desc:'Categoria do projeto'},
			{chave:'eixo', desc:'Eixo do projeto'},
			{chave:'feiraNome', desc:'Nome da feira (ex: Mostratec)'}
		];

		// tipo:'edicao' (a "Mostra de Trabalhos") ganhou tela própria em Mostra > Editar
		// (mostraCtrl.js/mostra.html) - esta tela cuida só de feiras externas de
		// classificação daqui pra frente, mas o filtro abaixo evita mostrar aqui qualquer
		// documento de edição que já exista.
		let mostraFeiras = function() {
			$scope.feiras = [];
			adminAPI.getFeiras()
			.success(function(feiras) {
				angular.forEach(feiras, function (value, key) {
					if (value.ano == $scope.ano && value.tipo !== 'edicao') {
						$scope.feiras.push(value);
					}
				});
			})
			.error(function(status) {
				console.log("Error: "+status);
			});
		}
		$scope.mostraFeiras = mostraFeiras();

		$scope.recarregar = function(){
			mostraFeiras();
		}

		let novaFeiraForm = function() {
			return { tipo: 'classificacao' };
		};
		$scope.feira = novaFeiraForm();

		$scope.salvarFeira = function(feira) {

			var categorias = [];
			if (feira.categoriaFundamentalI) { categorias.push('Fundamental I (1º ao 5º anos)'); }
			if (feira.categoriaFundamentalII) { categorias.push('Fundamental II (6º ao 9º anos)'); }
			if (feira.categoriaEnsinoMedio) { categorias.push('Ensino Médio, Técnico e Superior'); }

			var payload = {
				nome: feira.nome,
				tipo: 'classificacao',
				ano: $scope.ano,
				createdAt: feira.createdAt || new Date(),
				categorias: categorias,
				textoCertificado: feira.textoCertificado
			};

			var pedido;
			if (feira._id) {
				payload.id = feira._id;
				pedido = adminAPI.editarFeira(payload);
			} else {
				pedido = adminAPI.postFeira(payload);
			}

			pedido
			.success(function(data) {
				$scope.toast(feira._id ? 'Feira atualizada com sucesso!' : 'Feira cadastrada com sucesso!', 'success-toast');
				mostraFeiras();
				resetForm();
			})
			.error(function(status) {
				$scope.toast('Falha.','failed-toast');
				console.log("Error: "+status);
			});
		};

		// Preenche o formulário a partir de uma feira já cadastrada - reconstrói os
		// checkboxes de categoria a partir do array salvo, já que tipo:'classificacao'
		// grava como array de strings.
		$scope.editarFeiraForm = function(fei) {
			var form = angular.copy(fei);
			form.categoriaFundamentalI = (form.categorias || []).indexOf('Fundamental I (1º ao 5º anos)') !== -1;
			form.categoriaFundamentalII = (form.categorias || []).indexOf('Fundamental II (6º ao 9º anos)') !== -1;
			form.categoriaEnsinoMedio = (form.categorias || []).indexOf('Ensino Médio, Técnico e Superior') !== -1;
			$scope.feira = form;
			window.scrollTo(0, 0);
		};

		$scope.cancelarEdicao = function() {
			resetForm();
		};

		$scope.removerFeira = function(ev,id,nome) {
			var confirm = $mdDialog.confirm()
			.textContent('Deseja remover a feira '+nome+'?')
			.ariaLabel('Remover feira')
			.targetEvent(ev)
			.ok('Sim')
			.cancel('Não');
			$mdDialog.show(confirm).then(function() {
				adminAPI.removeFeira(id)
				.success(function(data) {
					$scope.toast('Feira removida com sucesso!','success-toast');
					var index = $scope.feiras.map(function(f) { return f._id; }).indexOf(id);
					if (index !== -1) {
						$scope.feiras.splice(index, 1);
					}
				})
				.error(function(status) {
					$scope.toast('Falha.','failed-toast');
					console.log("Error: "+status);
				});
			}, function() {});
		};

		let resetForm = function() {
			$scope.feira = novaFeiraForm();
			$scope.feirasForm.$setPristine();
			$scope.feirasForm.$setUntouched();
		};
	});
})();
