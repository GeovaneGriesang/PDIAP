(function(){
	'use strict';

	// Configuração da "Mostra de Trabalhos" = a própria edição anual do MOVACI/PDIAP (ex: X
	// MOVACI em 2026, XI MOVACI em 2027), com categorias/eixos, dias/turnos de avaliação e
	// quantidade de avaliadores por projeto próprios de cada ano. Reaproveita o mesmo schema/
	// coleção de Feira (tipo:'edicao') usado por feirasCtrl.js (feiras externas de
	// classificação, tipo:'classificacao') - ver comentário em models/feira-schema.js. Este
	// controller é uma cópia adaptada de feirasCtrl.js (só a parte de tipo:'edicao'), seguindo
	// o padrão já usado neste projeto de duplicar controllers parecidos em vez de generalizar
	// um só com uma flag de modo.
	angular
	.module('PDIAPa')
	.controller('mostraCtrl', function($scope, $mdDialog, $mdToast, adminAPI) {

		$scope.toast = function(message,tema) {
			var toast = $mdToast.simple().textContent(message).action('✖').position('top right').theme(tema).hideDelay(10000);
			$mdToast.show(toast);
		};

		$scope.feiras = [];
		$scope.ano = new Date().getFullYear();
		$scope.year = CadastraAno();
		$scope.TURNOS_DISPONIVEIS = ['Manhã', 'Tarde', 'Noite'];

		let mostraFeiras = function() {
			$scope.feiras = [];
			adminAPI.getFeiras()
			.success(function(feiras) {
				angular.forEach(feiras, function (value, key) {
					if (value.ano == $scope.ano && value.tipo === 'edicao') {
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
			return { tipo: 'edicao', categoriasEixos: [], diasAvaliacao: [], numAvaliadoresPorProjeto: 2 };
		};
		$scope.feira = novaFeiraForm();

		// Categoria/eixo é um EDITOR de lista nova (o admin digita as categorias/eixos dessa
		// edição), diferente da diretiva categoriaEixoPicker (que serve pra ESCOLHER de uma
		// lista já existente, usada no cadastro de avaliador) - por isso não reaproveita ela
		// aqui.
		$scope.adicionarCategoria = function() {
			$scope.feira.categoriasEixos.push({ categoria: '', eixos: [] });
		};
		$scope.removerCategoria = function(index) {
			$scope.feira.categoriasEixos.splice(index, 1);
		};

		// Dias/turnos de avaliação - mesma estrutura do bloco morto (comentado desde
		// 22/07/2023) em public/views/avaliadores.html, só que aqui é o admin quem cadastra os
		// dias/turnos em vez de ficarem hardcoded no HTML.
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
		// $scope.ano corrente, que é o filtro da listagem principal da tela) e deixa escolher
		// uma pra copiar as categorias/eixos - só preenche o formulário, não grava nada até o
		// admin clicar Salvar.
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
				tipo: 'edicao',
				ano: $scope.ano,
				createdAt: feira.createdAt || new Date(),
				categoriasEixos: feira.categoriasEixos,
				diasAvaliacao: feira.diasAvaliacao,
				numAvaliadoresPorProjeto: feira.numAvaliadoresPorProjeto
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
				$scope.toast(feira._id ? 'Mostra atualizada com sucesso!' : 'Mostra cadastrada com sucesso!', 'success-toast');
				mostraFeiras();
				resetForm();
			})
			.error(function(status) {
				$scope.toast('Falha.','failed-toast');
				console.log("Error: "+status);
			});
		};

		// Preenche o formulário a partir de uma edição já cadastrada - garante
		// numAvaliadoresPorProjeto preenchido (edições antigas podem não ter esse campo
		// gravado ainda).
		$scope.editarFeiraForm = function(fei) {
			var form = angular.copy(fei);
			form.categoriasEixos = form.categoriasEixos || [];
			form.diasAvaliacao = form.diasAvaliacao || [];
			form.numAvaliadoresPorProjeto = form.numAvaliadoresPorProjeto || 2;
			$scope.feira = form;
			window.scrollTo(0, 0);
		};

		$scope.cancelarEdicao = function() {
			resetForm();
		};

		$scope.removerFeira = function(ev,id,nome) {
			var confirm = $mdDialog.confirm()
			.textContent('Deseja remover a mostra '+nome+'?')
			.ariaLabel('Remover mostra')
			.targetEvent(ev)
			.ok('Sim')
			.cancel('Não');
			$mdDialog.show(confirm).then(function() {
				adminAPI.removeFeira(id)
				.success(function(data) {
					$scope.toast('Mostra removida com sucesso!','success-toast');
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
			$scope.mostraForm.$setPristine();
			$scope.mostraForm.$setUntouched();
		};
	});
})();
