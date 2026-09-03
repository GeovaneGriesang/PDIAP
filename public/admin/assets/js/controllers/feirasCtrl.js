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
		$scope.TURNOS_DISPONIVEIS = ['Manhã', 'Tarde', 'Noite'];

		// Máscaras disponíveis pro texto de certificado de classificação (ver
		// homeCtrl.js#emitirCertificado1, tipo 'Feira'). Só se aplica a tipo:'classificacao'.
		$scope.mascarasDisponiveis = [
			{chave:'nome', desc:'Nome do integrante'},
			{chave:'nomeProjeto', desc:'Nome do projeto'},
			{chave:'categoria', desc:'Categoria do projeto'},
			{chave:'eixo', desc:'Eixo do projeto'},
			{chave:'feiraNome', desc:'Nome da feira (ex: Mostratec)'}
		];

		let mostraFeiras = function() {
			$scope.feiras = [];
			adminAPI.getFeiras()
			.success(function(feiras) {
				angular.forEach(feiras, function (value, key) {
					if (value.ano == $scope.ano) {
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
			return { tipo: 'classificacao', categoriasEixos: [], diasAvaliacao: [] };
		};
		$scope.feira = novaFeiraForm();

		// Categoria/eixo é um EDITOR de lista nova (o admin digita as categorias/eixos
		// dessa edição), diferente da diretiva categoriaEixoPicker (que serve pra ESCOLHER
		// de uma lista já existente, usada no cadastro de avaliador) - por isso não
		// reaproveita ela aqui.
		$scope.adicionarCategoria = function() {
			$scope.feira.categoriasEixos.push({ categoria: '', eixos: [] });
		};
		$scope.removerCategoria = function(index) {
			$scope.feira.categoriasEixos.splice(index, 1);
		};

		// Dias/turnos de avaliação - mesma estrutura do bloco morto (comentado desde
		// 22/07/2023) em public/views/avaliadores.html, só que aqui é o admin quem
		// cadastra os dias/turnos em vez de ficarem hardcoded no HTML.
		$scope.adicionarDia = function() {
			$scope.feira.diasAvaliacao.push({ data: '', turnos: [] });
		};
		$scope.removerDia = function(index) {
			$scope.feira.diasAvaliacao.splice(index, 1);
		};
		$scope.turnoSelecionado = function(dia, turno) {
			return dia.turnos.indexOf(turno) !== -1;
		};
		$scope.alternarTurno = function(dia, turno) {
			var index = dia.turnos.indexOf(turno);
			if (index === -1) dia.turnos.push(turno);
			else dia.turnos.splice(index, 1);
		};

		// "Copiar de edição anterior": busca TODAS as feiras tipo:'edicao' (não só as do
		// $scope.ano corrente, que é o filtro da listagem principal da tela) e deixa
		// escolher uma pra copiar as categorias/eixos - só preenche o formulário, não
		// grava nada até o admin clicar Salvar.
		$scope.copiarDeEdicaoAnterior = function(ev) {
			adminAPI.getFeiras()
			.success(function(feiras) {
				var edicoes = feiras.filter(function(f) { return f.tipo === 'edicao' && f.categoriasEixos && f.categoriasEixos.length; })
					.sort(function(a, b) { return b.ano - a.ano; });
				if (!edicoes.length) {
					$scope.toast('Nenhuma edição anterior com categorias/eixos cadastrados ainda.', 'failed-toast');
					return;
				}
				$mdDialog.show({
					controller: function dialogController($scope, $mdDialog) {
						$scope.edicoes = edicoes;
						$scope.escolher = function(edicao) { $mdDialog.hide(edicao); };
						$scope.cancel = function() { $mdDialog.cancel(); };
					},
					templateUrl: 'admin/views/details.copiar-edicao.html',
					parent: angular.element(document.body),
					targetEvent: ev,
					clickOutsideToClose: true
				}).then(function(edicaoEscolhida) {
					$scope.feira.categoriasEixos = angular.copy(edicaoEscolhida.categoriasEixos);
				}, function() {});
			})
			.error(function(status) {
				console.log("Error: "+status);
			});
		};

		$scope.salvarFeira = function(feira) {

			var payload = {
				nome: feira.nome,
				tipo: feira.tipo,
				ano: $scope.ano,
				createdAt: feira.createdAt || new Date()
			};

			if (feira.tipo === 'edicao') {
				payload.categoriasEixos = feira.categoriasEixos;
				payload.diasAvaliacao = feira.diasAvaliacao;
			} else {
				var categorias = [];
				if (feira.categoriaFundamentalI) { categorias.push('Fundamental I (1º ao 5º anos)'); }
				if (feira.categoriaFundamentalII) { categorias.push('Fundamental II (6º ao 9º anos)'); }
				if (feira.categoriaEnsinoMedio) { categorias.push('Ensino Médio, Técnico e Superior'); }
				payload.categorias = categorias;
				payload.textoCertificado = feira.textoCertificado;
			}

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

		// Preenche o formulário a partir de uma feira já cadastrada (não existia edição
		// antes, só criar/remover) - reconstrói os checkboxes de categoria a partir do
		// array salvo, já que tipo:'classificacao' grava como array de strings.
		$scope.editarFeiraForm = function(fei) {
			var form = angular.copy(fei);
			if (form.tipo !== 'edicao') {
				form.categoriaFundamentalI = (form.categorias || []).indexOf('Fundamental I (1º ao 5º anos)') !== -1;
				form.categoriaFundamentalII = (form.categorias || []).indexOf('Fundamental II (6º ao 9º anos)') !== -1;
				form.categoriaEnsinoMedio = (form.categorias || []).indexOf('Ensino Médio, Técnico e Superior') !== -1;
			}
			form.categoriasEixos = form.categoriasEixos || [];
			form.diasAvaliacao = form.diasAvaliacao || [];
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
