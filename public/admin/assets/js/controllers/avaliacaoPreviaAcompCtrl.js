(function(){
	'use strict';

	// Avaliação > Prévia: andamento (avaliacao-previa-acompanhamento.html): cada trabalho da
	// Mostra com quem está avaliando, o que falta, as notas por critério e o parecer, a média e a
	// SUGESTÃO pelos critérios da organização; ações manuais e a decisão (vai pra Projeto.aprovado +
	// tipoAprovacao, os mesmos campos de Projetos > Editar projetos). Ver controllers/resultado-previa-controller.js.
	angular
	.module('PDIAPa')
	.controller('avaliacaoPreviaAcompCtrl', function($scope, $rootScope, $timeout, $http, $mdDialog) {

		$scope.mostras = [];
		$scope.dados = null;
		$scope.criterios = {};
		$scope.filtro = { situacao: 'todos', categoria: '', texto: '', ordem: 'media' };
		$scope.aberto = {};
		$scope.escolha = {};
		$scope.ocupado = false;

		$scope.SITUACOES = {
			'sem-texto': 'Sem texto', 'faltam-avaliadores': 'Faltam avaliadores(as)', 'em-avaliacao': 'Em avaliação', 'avaliado': 'Avaliado'
		};
		$scope.DECISOES = { anais: 'Aprovado - anais', apresentacao: 'Aprovado - apresentação', nao: 'Não aprovado' };
		$scope.situacaoAvaliacao = function(a) {
			return {
				convidado: 'Convite aguardando resposta', aceito: 'Avaliando', concluido: 'Concluída', recusado: 'Recusou',
				expirado: 'Convite vencido', removido: 'Tirado(a) pela organização'
			}[a.situacao] || a.situacao;
		};
		$scope.virgula = function(n) { return n === null || n === undefined ? '' : String(n).replace('.', ','); };
		var erroDe = function(response, padrao) {
			return typeof response.data === 'string' && response.data ? response.data : padrao;
		};

		$scope.carregar = function() {
			if (!$rootScope.mostraId) return;
			$http.get('/admin/avaliacao-previa/acompanhamento', { params: { mostraId: $rootScope.mostraId } }).then(function(response) {
				$scope.dados = response.data;
				$scope.criterios = angular.copy(response.data.criterios);
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
		$scope.conta = function(chave) {
			var t = ($scope.dados && $scope.dados.trabalhos) || [];
			if (chave === 'todos') return t.length;
			if (chave === 'divergentes') return t.filter(function(x) { return x.divergente; }).length;
			if (chave === 'sem-decisao') return t.filter(function(x) { return x.temTexto && !x.decisao; }).length;
			if (chave === 'decididos') return t.filter(function(x) { return x.decisao; }).length;
			return t.filter(function(x) { return x.situacao === chave; }).length;
		};
		$scope.filtrar = function(chave) { $scope.filtro.situacao = chave; };
		$scope.visiveis = function() {
			var f = $scope.filtro, texto = (f.texto || '').toLowerCase();
			var lista = (($scope.dados && $scope.dados.trabalhos) || []).filter(function(t) {
				if (f.categoria && t.categoria !== f.categoria) return false;
				if (texto && ((t.nomeProjeto || '') + ' ' + (t.numInscricao || '') + ' ' + (t.nomeEscola || '')).toLowerCase().indexOf(texto) === -1) return false;
				if (f.situacao === 'todos') return true;
				if (f.situacao === 'divergentes') return t.divergente;
				if (f.situacao === 'sem-decisao') return t.temTexto && !t.decisao;
				if (f.situacao === 'decididos') return !!t.decisao;
				return t.situacao === f.situacao;
			});
			return lista.sort(function(a, b) {
				if (f.ordem === 'media') return ((b.pct === null ? -1 : b.pct) - (a.pct === null ? -1 : a.pct)) || ((a.numInscricao || 0) - (b.numInscricao || 0));
				return (a.numInscricao || 0) - (b.numInscricao || 0);
			});
		};
		$scope.alternar = function(t) { $scope.aberto[t._id] = !$scope.aberto[t._id]; };

		// Avaliadores(as) que podem receber o trabalho: da Mostra, sem esse trabalho ativo; aprovados(as) primeiro.
		$scope.opcoesAvaliadores = function(t) {
			var ativos = t.avaliacoes.filter(function(a) { return ['convidado', 'aceito', 'concluido'].indexOf(a.situacao) !== -1; })
				.map(function(a) { return String(a.avaliador._id); });
			return (($scope.dados && $scope.dados.avaliadores) || []).filter(function(v) { return ativos.indexOf(String(v._id)) === -1; })
				.sort(function(x, y) {
					var cx = x.categoriasEixos.some(function(c) { return c.categoria === t.categoria; }) ? 0 : 1;
					var cy = y.categoriasEixos.some(function(c) { return c.categoria === t.categoria; }) ? 0 : 1;
					return ((y.apto ? 1 : 0) - (x.apto ? 1 : 0)) || (cx - cy) || (x.carga - y.carga);
				});
		};
		$scope.rotuloAvaliador = function(v, t) {
			var cats = v.categoriasEixos.filter(function(c) { return c.categoria === t.categoria; }).map(function(c) { return c.eixo; });
			return v.nome + ' - ' + v.carga + ' trabalho(s)' + (v.apto ? '' : ' - não aprovado(a) p/ prévia') +
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
		$scope.salvarCriterios = function() {
			acao($http.put('/admin/avaliacao-previa/criterios-resultado', angular.extend({ mostraId: $rootScope.mostraId }, $scope.criterios)), 'Critérios da sugestão salvos.', 'Falha ao salvar os critérios.');
		};
		$scope.decidir = function(t) {
			acao($http.put('/admin/avaliacao-previa/decisao', { mostraId: $rootScope.mostraId, projetoId: t._id, decisao: t.decisao || null }),
				t.decisao ? 'Decisão salva: ' + $scope.DECISOES[t.decisao] + '.' : 'Decisão retirada.', 'Falha ao salvar a decisão.');
		};
		$scope.usarSugestao = function(t) {
			t.decisao = t.sugestao;
			$scope.decidir(t);
		};
		$scope.atribuir = function(t) {
			var id = $scope.escolha[t._id];
			if (!id) return;
			acao($http.post('/admin/avaliacao-previa/atribuir', { mostraId: $rootScope.mostraId, projetoId: t._id, avaliadorId: id }),
				function(r) { return r.situacao === 'convidado' ? 'Convite enviado.' : 'Trabalho entregue.'; }, 'Falha ao entregar o trabalho.')
				.then(function() { $scope.escolha[t._id] = null; });
		};
		$scope.extra = function(t, mais) {
			acao($http.post('/admin/avaliacao-previa/extra', { mostraId: $rootScope.mostraId, projetoId: t._id, mais: mais }),
				function(r) { return 'Avaliadores(as) a mais neste trabalho: ' + r.extras + (r.novas ? ' (' + r.novas + ' entrega(s) nova(s)).' : '.'); }, 'Falha ao alterar.');
		};
		$scope.lembrar = function(a) {
			acao($http.post('/admin/avaliacao-previa/lembrar', { id: a._id }), function(r) { return 'Aviso reenviado para ' + r.email + '.'; }, 'Falha ao reenviar o aviso.');
		};
		$scope.remover = function(a, ev) {
			var texto = a.situacao === 'concluido'
				? 'A avaliação concluída de ' + a.avaliador.nome + ' deixa de contar na média deste trabalho.'
				: a.avaliador.nome + ' deixa de ver este trabalho.';
			$mdDialog.show($mdDialog.confirm().title('Tirar o trabalho desta pessoa?').textContent(texto + ' Se a distribuição automática estiver ligada, a vaga vai para outra pessoa.')
				.ariaLabel('Tirar').targetEvent(ev).ok('Tirar').cancel('Voltar')).then(function() {
				acao($http.post('/admin/avaliacao-previa/remover', { id: a._id }), 'Trabalho tirado de ' + a.avaliador.nome + '.', 'Falha ao tirar o trabalho.');
			}, function() {});
		};

		// Planilha (CSV com ; e BOM, abre direto no Excel em português).
		$scope.exportar = function() {
			var cel = function(v) { v = v === null || v === undefined ? '' : String(v); return '"' + v.replace(/"/g, '""') + '"'; };
			var linhas = [['Nº', 'Trabalho', 'Categoria', 'Eixo', 'Escola', 'Situação', 'Avaliações concluídas', 'Avaliações previstas', 'Média (%)', 'Média (pontos)', 'Máximo',
				'Diferença entre avaliadores(as) (p.p.)', 'Sugestão', 'Decisão', 'Notas (avaliador(a): nota)']];
			$scope.visiveis().forEach(function(t) {
				var notas = t.avaliacoes.filter(function(a) { return a.situacao === 'concluido'; })
					.map(function(a) { return a.avaliador.nome + ': ' + $scope.virgula(a.total) + '/' + a.maximo; }).join(' | ');
				linhas.push([t.numInscricao, t.nomeProjeto, t.categoria, t.eixo, t.nomeEscola, $scope.SITUACOES[t.situacao], t.concluidas, t.vagas,
					$scope.virgula(t.pct), $scope.virgula(t.mediaPontos), t.maximo, $scope.virgula(t.diferenca),
					t.sugestao ? $scope.DECISOES[t.sugestao] : '', t.decisao ? $scope.DECISOES[t.decisao] : '', notas]);
			});
			var csv = '﻿' + linhas.map(function(l) { return l.map(cel).join(';'); }).join('\r\n');
			var a = document.createElement('a');
			a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
			a.download = 'avaliacao-previa.csv';
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
		};
	});
})();
