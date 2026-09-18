(function(){
	'use strict';

	// Relatório de avaliadores: quem se inscreveu, quais categorias/eixos pretende
	// avaliar e em quais dia/turno está disponível (ver Fase 3 - diaTurnoPicker). Não
	// existia uma tela dedicada a isso antes; a lista em "Avaliação > Avaliadores" é
	// de CADASTRO (editar/remover), essa aqui é só leitura, pensada pra imprimir/
	// exportar.
	angular
	.module('PDIAPa')
	.controller('relatorioAvaliadoresCtrl', function($scope, $rootScope, $timeout, $filter, adminAPI, relatorioPdfService) {

		$scope.mostras = [];

		// O <md-select>+ng-repeat de Mostras, ao ser preenchido de forma assíncrona (ver
		// adminAPI.getMostras() abaixo), religa cada <md-option> e reescreve o ng-model no
		// processo (bug conhecido do Angular Material com ng-repeat dentro de md-select) -
		// guarda o valor persistido ANTES e só carrega a lista depois de reaplicá-lo, senão
		// o ano acaba travado no último item da lista.
		let anoPersistido = $rootScope.ano;

		$scope.avaliadores = [];
		$scope.busca = '';
		$scope.ordenacao = ['nome'];

		let carregar = function() {
			$scope.avaliadores = [];
			adminAPI.getAvaliadores()
			.success(function(dados) {
				angular.forEach(dados, function(value) {
					var ano = new Date(value.createdAt).getFullYear();
					if (ano !== $rootScope.ano) return;
					$scope.avaliadores.push({
						nome: value.nome,
						cpf: value.cpf,
						email: value.email,
						categoriasEixos: value.categoriasEixos || [],
						disponibilidade: value.disponibilidade || [],
						avaliacao: value.avaliacao === true
					});
				});
			})
			.error(function(status) {
				console.log('Erro ao carregar avaliadores: ' + status);
			});
		};

		adminAPI.getMostras()
		.success(function(mostras) {
			$scope.mostras = mostras;
			$timeout(function() {
				$rootScope.ano = anoPersistido || new Date().getFullYear();
				carregar();
			});
		})
		.error(function(status) {
			console.log('Error: '+status);
			$rootScope.ano = anoPersistido || new Date().getFullYear();
			carregar();
		});

		$scope.recarregar = function() {
			carregar();
		};

		$scope.filtroAvaliador = function(ava) {
			if (!$scope.busca) return true;
			var termo = $scope.busca.trim().toLowerCase();
			return (ava.nome || '').toLowerCase().indexOf(termo) !== -1 ||
				(ava.cpf || '').toLowerCase().indexOf(termo) !== -1;
		};

		function listaAtual() {
			return $filter('orderBy')($filter('filter')($scope.avaliadores, $scope.filtroAvaliador), $scope.ordenacao);
		}

		function textoCategoriasEixos(ava) {
			return (ava.categoriasEixos || []).map(function(ce) { return ce.categoria + ' - ' + ce.eixo; }).join('\n') || '-';
		}
		function textoDisponibilidade(ava) {
			return (ava.disponibilidade || []).map(function(dt) { return dt.data + ' - ' + dt.turno; }).join('\n') || '-';
		}

		function dados() {
			return {
				colunas: [
					{ texto: 'Nome', largura: 130 },
					{ texto: 'CPF', largura: 80 },
					{ texto: 'Categoria(s)/Eixo(s)', largura: '*' },
					{ texto: 'Disponibilidade (dia/turno)', largura: '*' },
					{ texto: 'Presença', largura: 55 }
				],
				linhas: listaAtual().map(function(ava) {
					return [ava.nome || '', ava.cpf || '', textoCategoriasEixos(ava), textoDisponibilidade(ava), ava.avaliacao ? 'Sim' : 'Não'];
				})
			};
		}

		function cabecalho() {
			return '*Avaliadores - ' + $rootScope.ano + '*';
		}

		$scope.copiarRelatorio = function() {
			var linhas = listaAtual().map(function(ava) {
				return '- ' + ava.nome + ' (' + (ava.cpf || 'sem documento') + ')' +
					'\n   Categoria(s)/Eixo(s): ' + textoCategoriasEixos(ava).replace(/\n/g, ', ') +
					'\n   Disponibilidade: ' + textoDisponibilidade(ava).replace(/\n/g, ', ');
			});
			var texto = cabecalho() + '\n\n' + linhas.length + ' avaliador(es)\n\n' + linhas.join('\n');
			if (navigator.clipboard && navigator.clipboard.writeText) {
				navigator.clipboard.writeText(texto);
			}
		};

		$scope.baixarCsv = function() {
			var d = dados();
			var csv = [d.colunas.map(function(c) { return c.texto; }).join(';')];
			d.linhas.forEach(function(linha) {
				csv.push(linha.map(function(v) {
					var t = (v === undefined || v === null) ? '' : String(v);
					if (/["\n;]/.test(t)) t = '"' + t.replace(/"/g, '""') + '"';
					return t;
				}).join(';'));
			});
			var blob = new Blob(['﻿' + csv.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
			var url = URL.createObjectURL(blob);
			var a = document.createElement('a');
			a.href = url;
			a.download = 'avaliadores-' + $rootScope.ano + '.csv';
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		};

		$scope.gerarPDF = function() {
			var d = dados();
			relatorioPdfService.tabela({
				titulo: 'Avaliadores - ' + $rootScope.ano,
				subtitulo: d.linhas.length + ' avaliador(es)',
				orientacao: 'landscape',
				colunas: d.colunas,
				linhas: d.linhas,
				arquivo: $rootScope.ano + '_Avaliadores'
			});
		};
	});
})();
