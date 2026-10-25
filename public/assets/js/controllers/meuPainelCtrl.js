(function(){
	'use strict';

	// "Meu painel": o painel único de qualquer pessoa logada (estudante, orientador(a),
	// avaliador(a), participante...), com tudo num lugar - participações em cada Mostra
	// (derivadas dos vínculos, ver routes/index.js#/conta/meus-dados) e todos os certificados.
	// A sessão é a própria Pessoa (utils/sessao.js); quem está logado vem de
	// $rootScope.pessoaLogada (ui-routes.js#checkLoggedinPessoa).
	angular
	.module('PDIAP')
	//
	// Menu lateral (meu-painel.html): "Início" (resumo) e uma entrada por Mostra - a Mostra
	// escolhida mostra as participações dela e os certificados do mesmo ano.
	.controller('meuPainelCtrl', function($scope, $rootScope, $state, $window, $http, $mdToast, $mdDialog, $mdSidenav, $mdMedia, $interval, contaAPI, certificadosService, avaliacaoOffline) {

		var logado = $rootScope.pessoaLogada || {};

		// Se por algum motivo chegou aqui sem ter definido senha ainda (ex: voltou pelo
		// histórico do navegador), manda pra tela obrigatória em vez de mostrar o painel.
		if (!logado.senhaDefinida) {
			$state.go('painelTrocarSenha');
			return;
		}

		$scope.nome = logado.nome;
		$scope.estadoDados = 'painelDados';
		$scope.ehAdmin = !!logado.admin;
		$scope.abrirAdmin = function() {
			$window.location.href = '/master';
		};
		$scope.estadoTrocarSenha = 'painelTrocarSenha';
		$scope.conta = null;

		$scope.toast = function(message, tema) {
			$mdToast.show($mdToast.simple().textContent(message).action('✖').position('top right').theme(tema).hideDelay(6000));
		};

		$scope.selecionada = null; // Mostra aberta no conteúdo; null = Início
		$scope.secaoMostras = true;
		$scope.certificados = null; // lista de certificadosService.listarCertificados
		$scope.erroCertificados = false;

		$scope.selecionar = function(mostra) {
			$scope.selecionada = mostra;
			if (!$mdMedia('gt-sm')) $mdSidenav('menuPainel').close();
		};
		// md-list-item só vira item clicável com ng-click/ui-sref (ui-state não conta), por isso
		// a navegação do menu é por aqui.
		$scope.irPara = function(estado) {
			$state.go(estado);
		};
		$scope.abrirMenu = function() {
			$mdSidenav('menuPainel').open();
		};

		// Certificado não guarda a Mostra, só o ano (ver routes/index.js#/emitirCertificado),
		// então a ligação com a Mostra é pelo ano. Se houver duas Mostras no mesmo ano, os
		// certificados daquele ano aparecem nas duas.
		// Certificado com Mostra (mostraId) vai só pra ela - duas Mostras no mesmo ano (X e XI MOVACI)
		// não dividem certificado; registro antigo sem Mostra cai pelo ano, como antes.
		var daMostra = function(c, mostra) {
			if (c.mostraId && mostra.mostraId) return c.mostraId === mostra.mostraId;
			return !!mostra.ano && c.ano === mostra.ano;
		};
		$scope.certificadosDaMostra = function(mostra) {
			return ($scope.certificados || []).filter(function(c) { return daMostra(c, mostra); });
		};
		$scope.certificadosAvulsos = function() {
			var mostras = ($scope.conta && $scope.conta.mostras) || [];
			return ($scope.certificados || []).filter(function(c) { return !mostras.some(function(m) { return daMostra(c, m); }); });
		};
		$scope.baixar = function(certificado) {
			if (!certificado.baixar()) {
				$scope.toast('O certificado deste ano ainda não está disponível. Fale com a organização da MOVACI.', 'failed-toast');
			}
		};

		var carregarConta = function() {
			contaAPI.getMeusDados()
			.then(function(response) {
				$scope.conta = response.data;
				if ($scope.conta.nome) $scope.nome = $scope.conta.nome;
				if (!$scope.conta.documento) {
					$scope.certificados = [];
					return;
				}
				certificadosService.listarCertificados($scope.conta.documento)
				.then(function(itens) {
					$scope.certificados = itens;
				}, function() {
					$scope.erroCertificados = true;
				});
			}, function(response) {
				// Sem internet o aviso do topo já explica; participações e certificados voltam com a conexão.
				if (avaliacaoOffline.semRede(response)) return;
				$scope.toast('Não foi possível carregar suas participações.', 'failed-toast');
			});
		};
		carregarConta();

		// Abre o mesmo diálogo da página pública de certificados, com o documento de quem está
		// logado - TODOS os certificados da pessoa (ver services/certificadosService.js).
		$scope.buscandoCertificados = false;
		$scope.verCertificados = function() {
			var documento = $scope.conta && $scope.conta.documento;
			if (!documento) {
				$scope.toast('Seu cadastro está sem documento de identificação. Fale com a organização.', 'failed-toast');
				return;
			}
			certificadosService.buscarPorDocumento(documento);
		};

		// Avaliação prévia (routes/painel-avaliacoes.js): trabalhos recebidos pra avaliar.
		$scope.virgula = function(n) { return n === null || n === undefined ? '' : String(n).replace('.', ','); };
		$scope.avaliacoes = [];
		var carregarAvaliacoes = function() {
			$http.get('/api/painel/avaliacoes-previas').then(function(response) {
				$scope.avaliacoes = response.data || [];
			}, function() {});
		};
		carregarAvaliacoes();
		var erroDe = function(response, padrao) {
			return typeof response.data === 'string' && response.data ? response.data : padrao;
		};

		// Avaliação no evento (routes/painel-avaliacoes-finais.js): um cartão por Mostra, em ordem de nº.
		// Com internet, a lista e as fichas ficam guardadas no aparelho (avaliacaoOfflineService.js);
		// sem internet, o painel mostra a lista guardada e o que ainda não foi enviado.
		$scope.avaliacoesFinais = [];
		$scope.buscaFinal = { texto: '' };
		$scope.semInternet = !!$rootScope.semInternet;
		var carregarFinais = function(primeira) {
			$http.get('/api/painel/avaliacoes-finais').then(function(response) {
				$scope.semInternet = $rootScope.semInternet = false;
				if (!$scope.conta) carregarConta();
				$scope.avaliacoesFinais = response.data || [];
				avaliacaoOffline.guardarLista($scope.avaliacoesFinais);
				if (primeira) avaliacaoOffline.prepararFichas($scope.avaliacoesFinais);
				avaliacaoOffline.enviarPendentes();
			}, function(response) {
				if (!avaliacaoOffline.semRede(response)) return;
				$scope.semInternet = true;
				if (primeira || !$scope.avaliacoesFinais.length) $scope.avaliacoesFinais = avaliacaoOffline.lista();
			});
		};
		carregarFinais(true);
		// A fila é lida do aparelho só quando muda (ler a cada digest devolvia objetos novos: $rootScope:infdig).
		var filaPorId = {};
		var atualizarFila = function() {
			$scope.filaOffline = avaliacaoOffline.fila();
			$scope.recusadasOffline = $scope.filaOffline.filter(function(i) { return i.erro; });
			filaPorId = {};
			$scope.filaOffline.forEach(function(i) { filaPorId[i._id] = i; });
		};
		atualizarFila();
		// Enviou o que estava no aparelho: a lista do servidor passa a valer de novo.
		$scope.$on('avaliacaoOffline:mudou', function() {
			atualizarFila();
			if (!$scope.filaOffline.length) carregarFinais(false);
		});
		// Sem internet: confere a cada 20 s se voltou (o aviso some e a lista se atualiza).
		var conferir = $interval(function() { if ($scope.semInternet) carregarFinais(false); }, 20000);
		$scope.$on('$destroy', function() { $interval.cancel(conferir); });
		$scope.naFila = function(a) { return filaPorId[a._id] || null; };
		$scope.tentarDeNovo = function(id) { avaliacaoOffline.tentarDeNovo(id); };
		$scope.nomeDaFila = function(item) {
			var a = $scope.avaliacoesFinais.filter(function(x) { return x._id === item._id; })[0];
			return a ? (a.projeto.numInscricao ? 'nº ' + a.projeto.numInscricao + ' - ' : '') + a.projeto.nomeProjeto : 'Trabalho';
		};
		var gruposCache = { lista: null, grupos: [] };
		$scope.gruposFinais = function() {
			if (gruposCache.lista === $scope.avaliacoesFinais) return gruposCache.grupos;
			var grupos = [];
			$scope.avaliacoesFinais.forEach(function(a) {
				var g = grupos.filter(function(x) { return x.mostra._id === a.mostra._id; })[0];
				if (!g) { g = { mostra: a.mostra, itens: [], concluidas: 0 }; grupos.push(g); }
				g.itens.push(a);
				if (a.situacao === 'concluido') g.concluidas++;
			});
			gruposCache = { lista: $scope.avaliacoesFinais, grupos: grupos };
			return grupos;
		};
		$scope.filtroFinal = function(a) {
			var t = ($scope.buscaFinal.texto || '').toLowerCase();
			return !t || ((a.projeto.numInscricao || '') + ' ' + (a.projeto.nomeProjeto || '')).toLowerCase().indexOf(t) !== -1;
		};

		$scope.aceitarAvaliacao = function(a) {
			a.ocupado = true;
			$http.post('/api/painel/avaliacoes-previas/' + a._id + '/aceitar').then(function() {
				$scope.toast('Convite aceito. O texto e a ficha já estão disponíveis.', 'success-toast');
				$state.go('painelAvaliacaoPrevia', { id: a._id });
			}, function(response) {
				a.ocupado = false;
				$scope.toast(erroDe(response, 'Não foi possível aceitar.'), 'failed-toast');
				carregarAvaliacoes();
			});
		};
		$scope.recusarAvaliacao = function(a, ev) {
			var dialogo = $mdDialog.prompt()
				.title('Recusar o convite?')
				.textContent('O trabalho vai para outra pessoa. Se quiser, conte o motivo (opcional).')
				.placeholder('Motivo (opcional)').ariaLabel('Motivo').initialValue('')
				.targetEvent(ev).ok('Recusar').cancel('Voltar');
			$mdDialog.show(dialogo).then(function(motivo) {
				a.ocupado = true;
				$http.post('/api/painel/avaliacoes-previas/' + a._id + '/recusar', { motivo: motivo || '' }).then(function() {
					$scope.toast('Convite recusado.', 'success-toast');
					carregarAvaliacoes();
				}, function(response) {
					a.ocupado = false;
					$scope.toast(erroDe(response, 'Não foi possível recusar.'), 'failed-toast');
					carregarAvaliacoes();
				});
			}, function() {});
		};

		$scope.logout = function(ev) {
			var sair = function() {
				avaliacaoOffline.esquecerLogin();
				$http.post('/logout').finally(function() {
					$window.location.href = '/';
				});
			};
			var n = avaliacaoOffline.fila().length;
			if (!n) return sair();
			$mdDialog.show($mdDialog.confirm()
				.title('Há avaliações ainda não enviadas')
				.textContent(n + ' avaliação(ões) feita(s) sem internet ainda está(ão) só neste aparelho. Elas continuam guardadas e são enviadas quando você entrar de novo, neste aparelho, com internet. Sair mesmo assim?')
				.ariaLabel('Sair').targetEvent(ev).ok('Sair').cancel('Ficar')).then(sair, function() {});
		};
	});
})();
