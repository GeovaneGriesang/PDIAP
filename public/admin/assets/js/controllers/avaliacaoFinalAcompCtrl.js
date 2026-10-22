(function(){
	'use strict';

	// Avaliação > No evento: acompanhamento (avaliacao-final-acompanhamento.html): cada trabalho aprovado
	// da Mostra com quem avalia, o que falta, as notas por critério e a nota que já foi pro Ranking
	// (Projeto.avaliacao); trocas, reabrir uma avaliação e "não veio" (passa os pendentes da pessoa
	// adiante). Ver controllers/avaliacao-final-controller.js.
	angular
	.module('PDIAPa')
	.controller('avaliacaoFinalAcompCtrl', function($scope, $rootScope, $timeout, $http, $mdDialog) {

		$scope.mostras = [];
		$scope.dados = null;
		$scope.filtro = { situacao: 'todos', categoria: '', texto: '', ordem: 'numero', avaliador: '' };
		$scope.aberto = {};
		$scope.escolha = {};
		$scope.ocupado = false;
		$scope.verAvaliadores = false;

		$scope.SITUACOES = {
			'faltam-avaliadores': 'Faltam avaliadores(as)', 'em-avaliacao': 'Faltam avaliar', 'avaliado': 'Avaliado', 'nao-aprovado': 'Não aprovado'
		};
		$scope.virgula = function(n) { return n === null || n === undefined ? '' : String(n).replace('.', ','); };
		$scope.notasTexto = function(t) {
			return t.notasRanking.map(function(n, i) {
				var v = n === null || n === undefined || n === '' ? '-' : $scope.virgula(n);
				return i === $scope.dados.vagas ? 'desempate ' + v : v;
			}).join(' + ');
		};
		var erroDe = function(response, padrao) {
			return typeof response.data === 'string' && response.data ? response.data : padrao;
		};

		$scope.carregar = function() {
			if (!$rootScope.mostraId) return;
			$http.get('/admin/avaliacao-final/acompanhamento', { params: { mostraId: $rootScope.mostraId } }).then(function(response) {
				$scope.dados = response.data;
				$scope.categorias = response.data.trabalhos.map(function(t) { return t.categoria; })
					.filter(function(c, i, l) { return c && l.indexOf(c) === i; }).sort();
			}, function(response) {
				$scope.dados = null;
				$scope.toast(erroDe(response, 'Não foi possível carregar o acompanhamento.'), 'failed-toast');
			});
		};
		$scope.recarregar = function() { $scope.dados = null; $scope.aberto = {}; $scope.carregar(); };

		$http.get('/admin/mostraFeiras').then(function(response) {
			$scope.mostras = (response.data || []).filter(function(f) { return f.tipo === 'edicao'; })
				.sort(function(a, b) { return (b.ano - a.ano) || (String(a._id) < String(b._id) ? 1 : -1); });
			$timeout(function() {
				if (!$rootScope.mostraId && $scope.mostras.length) $rootScope.mostraId = $scope.mostras[0]._id;
				$scope.carregar();
			});
		});

		// --- resumo e filtros ---
		var trabalhos = function() { return ($scope.dados && $scope.dados.trabalhos) || []; };
		$scope.conta = function(chave) {
			var t = trabalhos();
			if (chave === 'todos') return t.length;
			if (chave === 'aprovados') return t.filter(function(x) { return x.situacao !== 'nao-aprovado'; }).length;
			if (chave === 'manual') return t.filter(function(x) { return x.notaManual; }).length;
			return t.filter(function(x) { return x.situacao === chave; }).length;
		};
		$scope.avaliacoesFeitas = function() {
			return trabalhos().filter(function(t) { return t.situacao !== 'nao-aprovado'; })
				.reduce(function(s, t) { return s + Math.min(t.concluidas, t.vagas); }, 0);
		};
		$scope.avaliacoesPrevistas = function() { return $scope.conta('aprovados') * (($scope.dados && $scope.dados.vagas) || 0); };
		$scope.filtrar = function(chave) { $scope.filtro.situacao = chave; };
		$scope.visiveis = function() {
			var f = $scope.filtro, texto = (f.texto || '').toLowerCase();
			var lista = trabalhos().filter(function(t) {
				if (f.categoria && t.categoria !== f.categoria) return false;
				if (texto) {
					var nomes = t.avaliacoes.filter(function(a) { return a.situacao !== 'removido'; }).map(function(a) { return a.avaliador.nome || ''; }).join(' ');
					if (((t.nomeProjeto || '') + ' ' + (t.numInscricao || '') + ' ' + (t.nomeEscola || '') + ' ' + nomes).toLowerCase().indexOf(texto) === -1) return false;
				}
				if (f.situacao === 'todos') return true;
				if (f.situacao === 'manual') return t.notaManual;
				return t.situacao === f.situacao;
			});
			return lista.sort(function(a, b) {
				if (f.ordem === 'nota') return (b.somaRanking - a.somaRanking) || ((a.numInscricao || 0) - (b.numInscricao || 0));
				return (a.numInscricao || 0) - (b.numInscricao || 0);
			});
		};
		$scope.alternar = function(t) { $scope.aberto[t._id] = !$scope.aberto[t._id]; };
		$scope.avaliadoresVisiveis = function() {
			var texto = ($scope.filtro.avaliador || '').toLowerCase();
			return (($scope.dados && $scope.dados.avaliadores) || []).filter(function(v) {
				return !texto || ((v.nome || '') + ' ' + (v.email || '')).toLowerCase().indexOf(texto) !== -1;
			});
		};

		// Quem pode receber o trabalho: da Mostra, com conta, sem esse trabalho ativo; presentes e da
		// mesma categoria primeiro, depois a menor carga.
		$scope.opcoesAvaliadores = function(t) {
			var ativos = t.avaliacoes.filter(function(a) { return a.situacao !== 'removido'; }).map(function(a) { return String(a.avaliador._id); });
			return (($scope.dados && $scope.dados.avaliadores) || []).filter(function(v) { return v.temConta && ativos.indexOf(String(v._id)) === -1; })
				.sort(function(x, y) {
					var cx = x.categoriasEixos.some(function(c) { return c.categoria === t.categoria; }) ? 0 : 1;
					var cy = y.categoriasEixos.some(function(c) { return c.categoria === t.categoria; }) ? 0 : 1;
					return ((y.presente ? 1 : 0) - (x.presente ? 1 : 0)) || (cx - cy) || (x.pendentes - y.pendentes);
				});
		};
		$scope.rotuloAvaliador = function(v, t) {
			var cats = v.categoriasEixos.filter(function(c) { return c.categoria === t.categoria; }).map(function(c) { return c.eixo; });
			return v.nome + ' - ' + v.pendentes + ' a avaliar' + (v.presente ? '' : ' - presença não confirmada') +
				(cats.length ? ' - ' + cats.join(', ') : (v.categoriasEixos.length ? ' - outra categoria' : ''));
		};

		// --- ações ---
		var acao = function(promessa, sucesso, padrao) {
			$scope.ocupado = true;
			return promessa.then(function(response) {
				if (sucesso) $scope.toast(typeof sucesso === 'function' ? sucesso(response.data) : sucesso, 'success-toast');
				$scope.carregar();
			}, function(response) {
				$scope.toast(erroDe(response, padrao), 'failed-toast');
			}).finally(function() { $scope.ocupado = false; });
		};
		var confirmar = function(ev, titulo, texto, ok) {
			return $mdDialog.show($mdDialog.confirm().title(titulo).textContent(texto).ariaLabel(titulo).targetEvent(ev).ok(ok).cancel('Voltar'));
		};
		$scope.atribuir = function(t) {
			var id = $scope.escolha[t._id];
			if (!id) return;
			acao($http.post('/admin/avaliacao-final/atribuir', { mostraId: $rootScope.mostraId, projetoId: t._id, avaliadorId: id }),
				function(r) { return r.situacao === 'concluido' ? 'Trabalho devolvido, com a avaliação que a pessoa já tinha concluído.' : 'Trabalho entregue.'; }, 'Falha ao entregar o trabalho.')
				.then(function() { $scope.escolha[t._id] = null; });
		};
		$scope.remover = function(a, ev) {
			var texto = a.situacao === 'concluido'
				? 'A nota de ' + a.avaliador.nome + ' sai do ranking deste trabalho.'
				: a.avaliador.nome + ' deixa de ver este trabalho.';
			confirmar(ev, 'Tirar o trabalho desta pessoa?', texto + ' A vaga fica aberta para você entregar a outra pessoa.', 'Tirar').then(function() {
				acao($http.post('/admin/avaliacao-final/remover', { id: a._id }), 'Trabalho tirado de ' + a.avaliador.nome + '.', 'Falha ao tirar o trabalho.');
			}, function() {});
		};
		$scope.reabrir = function(a, ev) {
			confirmar(ev, 'Reabrir esta avaliação?', a.avaliador.nome + ' poderá corrigir as notas no Meu painel e concluir de novo. Até lá, a nota dela sai do ranking deste trabalho.', 'Reabrir').then(function() {
				acao($http.post('/admin/avaliacao-final/reabrir', { id: a._id }), 'Avaliação reaberta.', 'Falha ao reabrir.');
			}, function() {});
		};
		$scope.liberar = function(v, ev) {
			confirmar(ev, 'Passar os trabalhos adiante?', 'Os ' + v.pendentes + ' trabalho(s) que ' + v.nome + ' ainda não avaliou saem da lista dela' +
				($scope.dados.iniciada ? ' e vão para outras pessoas automaticamente.' : '.') + ' O que já foi concluído continua valendo.', 'Passar adiante').then(function() {
				acao($http.post('/admin/avaliacao-final/liberar-pendentes', { mostraId: $rootScope.mostraId, avaliadorId: v._id }),
					function(r) { return r.liberados + ' trabalho(s) passado(s) adiante.'; }, 'Falha ao liberar os trabalhos.');
			}, function() {});
		};
		$scope.recalcular = function(ev) {
			confirmar(ev, 'Recalcular as notas no ranking?', 'A nota de todos os trabalhos avaliados pelo sistema é regravada com as avaliações concluídas e a média atual da etapa prévia. Notas lançadas à mão no Inserir em trabalhos sem avaliação pelo sistema não mudam.', 'Recalcular').then(function() {
				acao($http.post('/admin/avaliacao-final/recalcular', { mostraId: $rootScope.mostraId }), function(r) { return r.trabalhos + ' trabalho(s) recalculado(s).'; }, 'Falha ao recalcular.');
			}, function() {});
		};

		// Planilha (CSV com ; e BOM, abre direto no Excel em português).
		$scope.exportar = function() {
			var cel = function(v) { v = v === null || v === undefined ? '' : String(v); return '"' + v.replace(/"/g, '""') + '"'; };
			var linhas = [['Nº', 'Trabalho', 'Categoria', 'Eixo', 'Escola', 'Situação', 'Avaliações concluídas', 'Avaliações previstas', 'Escrita (média da prévia)',
				'Notas no ranking', 'Soma no ranking', 'Nota lançada no Inserir', 'Avaliações (avaliador(a): nota)', 'A avaliar']];
			$scope.visiveis().forEach(function(t) {
				var feitas = t.avaliacoes.filter(function(a) { return a.situacao === 'concluido'; }).map(function(a) { return a.avaliador.nome + ': ' + $scope.virgula(a.nota); }).join(' | ');
				var faltam = t.avaliacoes.filter(function(a) { return a.situacao === 'pendente'; }).map(function(a) { return a.avaliador.nome; }).join(' | ');
				linhas.push([t.numInscricao, t.nomeProjeto, t.categoria, t.eixo, t.nomeEscola, $scope.SITUACOES[t.situacao], t.concluidas, t.vagas,
					$scope.virgula(t.mediaPrevia), $scope.notasTexto(t), $scope.virgula(t.somaRanking), t.notaManual ? 'sim' : '', feitas, faltam]);
			});
			var csv = '﻿' + linhas.map(function(l) { return l.map(cel).join(';'); }).join('\r\n');
			var a = document.createElement('a');
			a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
			a.download = 'avaliacao-no-evento.csv';
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
		};
	});
})();
