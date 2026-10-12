(function(){
	'use strict';

	// Projeto no "Meu painel" (painel-projeto.html, /painel/projeto/:id): qualquer integrante vê a
	// situação, os integrantes e os documentos; para alterar, clica em "Editar projeto", que pega a
	// TRAVA do projeto (routes/painel-projetos.js) - um(a) integrante por vez. Enquanto edita, o
	// formulário é o mesmo da área antiga do projeto (update.html + updateCtrl, que herdam deste
	// escopo projeto1/projeto2/projeto5/palavraChave/opcoes/carregarProjeto/toast).
	//
	// A trava é renovada a cada minuto enquanto houve atividade nos últimos 15 minutos; parado
	// mais que isso, a edição é encerrada sozinha. Sair da tela ou fechar a aba solta a trava.
	angular
	.module('PDIAP')
	.controller('painelProjetoCtrl', function($scope, $rootScope, $state, $stateParams, $window, $interval, $mdToast, projetosAPI) {

		var INATIVIDADE_MS = 15 * 60 * 1000;
		var RENOVAR_MS = 60 * 1000;

		if (!($rootScope.pessoaLogada && $rootScope.pessoaLogada.senhaDefinida)) {
			$state.go('painelTrocarSenha');
			return;
		}

		projetosAPI.usarProjeto($stateParams.id);

		$scope.carregando = true;
		$scope.erro = null;
		$scope.projeto = {};
		$scope.projeto1 = {};
		$scope.projeto2 = {};
		$scope.projeto5 = {};
		$scope.opcoes = {};
		$scope.painel = {};
		$scope.edicao = { ativa: false, abrindo: false, ocupadaPor: null };

		// Palavras-chave digitadas separadas por vírgula ou ponto e vírgula (mesma regra da
		// inscrição). Muta o array (não reatribui) porque update.html usa este mesmo objeto.
		$scope.palavraChave = [];
		$scope.palavraChaveTexto = '';
		$scope.atualizarPalavraChave = function(texto) {
			var partes = (texto || '').split(/[,;]+/)
				.map(function(p) { return p.trim(); })
				.filter(function(p) { return p.length > 0; });
			$scope.palavraChave.length = 0;
			partes.forEach(function(p) { $scope.palavraChave.push(p); });
		};

		$scope.toast = function(message, tema) {
			$mdToast.show($mdToast.simple().textContent(message).action('✖').position('top right').theme(tema).hideDelay(10000));
		};


		// Documentos cadastrados pelo admin (Eventos > Cadastrar Documento) - os mesmos da home. A
		// área antiga do projeto linkava arquivos fixos em /alpha/documentos que não existiam mais.
		$scope.documentos = [];
		projetosAPI.getDocumentos().then(function(response) {
			$scope.documentos = (response.data || []).filter(function(d) { return d.exibe; });
		}, function() {});

		var avisoSituacao = function(projeto) {
			if (projeto.aprovado === true) {
				if (projeto.participa === true) return { titulo: 'PARABÉNS!', texto: 'Esse projeto foi aprovado e já está confirmado para participar da MOVACI. Bom trabalho!' };
				if (projeto.participa === false) return { texto: 'Esse projeto foi aprovado, mas, por escolha do grupo, está fora da lista de confirmados para a MOVACI.' };
				return { titulo: 'PARABÉNS!', texto: 'Esse projeto foi aprovado, mas AINDA NÃO CONFIRMOU PRESENÇA na MOVACI. Em "Editar projeto", aba Projeto, marque a participação.' };
			}
			if (projeto.aprovado === false) {
				return { texto: 'Infelizmente, esse projeto não foi selecionado para apresentação na MOVACI. Mas não desanime! ' +
					'Não estar selecionado não quer dizer que o projeto não seja bom. Fique atento(a): há uma lista de suplência e, ' +
					'em caso de desistências, novos projetos serão chamados.' };
			}
			return { texto: 'A inscrição foi recebida e está em análise pela organização.' };
		};

		// Mesmo preenchimento que a área antiga do projeto fazia (adminCtrl), pra update.html.
		var carregarProjeto = function() {
			return projetosAPI.getProjeto()
			.then(function(response) {
				var projeto = response.data;
				$scope.projeto = projeto;
				$scope.painel = projeto._painel || {};
				// Campos editáveis da Mostra DO PROJETO (cada Mostra tem os seus).
				$scope.opcoes = $scope.painel.opcoes || {};
				$scope.aviso = avisoSituacao(projeto);
				$scope.orientadores = (projeto.integrantes || []).filter(function(i) { return i.tipo === 'Orientador'; });
				$scope.estudantes = (projeto.integrantes || []).filter(function(i) { return i.tipo === 'Aluno'; });

				$scope.projeto1.nomeProjeto = projeto.nomeProjeto;
				$scope.projeto1.categoria = projeto.categoria;
				$scope.projeto1.eixo = projeto.eixo;
				$scope.projeto1.resumo = projeto.resumo;
				$scope.projeto1.participa = projeto.participa;

				$scope.palavraChave.length = 0;
				(projeto.palavraChave ? projeto.palavraChave.split(',') : []).forEach(function(p) { $scope.palavraChave.push(p); });
				$scope.palavraChaveTexto = $scope.palavraChave.join(', ');

				$scope.projeto2.nomeEscola = projeto.nomeEscola;
				$scope.projeto2.escola = projeto.escola;
				$scope.projeto2.estado = projeto.estado;
				$scope.projeto2.cidade = projeto.cidade;
				$scope.projeto2.cep = projeto.cep;
				if ($scope.projeto2.cep && $scope.projeto2.cep.length === 8) {
					$scope.projeto2.cep = $scope.projeto2.cep.substring(0, 2) + '.' + $scope.projeto2.cep.substring(2, 5) + '-' + $scope.projeto2.cep.substring(5);
				}

				$scope.projeto5.hospedagem = projeto.hospedagem ? projeto.hospedagem.split(',') : [];
				$scope.hospedagemVerify = $scope.projeto5.hospedagem.length ? 'Sim' : 'Não';

				$scope.relatorio = projeto.relatorio2;
				$scope.carregando = false;

				// Trava de outra pessoa ativa: mostra quem está editando.
				var trava = $scope.painel.trava || {};
				$scope.edicao.ocupadaPor = trava.ativa && !trava.minha && !$scope.edicao.ativa ? trava.nome : null;
			}, function(response) {
				$scope.carregando = false;
				$scope.erro = response.status === 404 ? 'Projeto não encontrado entre os seus.' : 'Não foi possível carregar o projeto.';
			});
		};
		$scope.carregarProjeto = carregarProjeto;
		carregarProjeto();

		// --- trava de edição -------------------------------------------------------------

		var ultimaAtividade = Date.now();
		var marcarAtividade = function() { ultimaAtividade = Date.now(); };
		var renovador = null;

		var pararEdicao = function() {
			$scope.edicao.ativa = false;
			projetosAPI.definirTrava(null);
			if (renovador) { $interval.cancel(renovador); renovador = null; }
			['keydown', 'mousedown', 'input', 'touchstart'].forEach(function(ev) { document.removeEventListener(ev, marcarAtividade, true); });
		};

		$scope.editar = function() {
			$scope.edicao.abrindo = true;
			projetosAPI.pegarTrava()
			.then(function(response) {
				projetosAPI.definirTrava(response.data.codigo);
				$scope.edicao.ativa = true;
				$scope.edicao.ocupadaPor = null;
				marcarAtividade();
				['keydown', 'mousedown', 'input', 'touchstart'].forEach(function(ev) { document.addEventListener(ev, marcarAtividade, true); });
				renovador = $interval(function() {
					if (Date.now() - ultimaAtividade > INATIVIDADE_MS) {
						$scope.concluirEdicao(true);
						return;
					}
					projetosAPI.renovarTrava().then(function() {}, function() {
						pararEdicao();
						$scope.toast('A sua edição foi encerrada. Abra a edição de novo para continuar.', 'failed-toast');
						carregarProjeto();
					});
				}, RENOVAR_MS);
				carregarProjeto();
			}, function(response) {
				if (response.status === 409) {
					$scope.edicao.ocupadaPor = (response.data && response.data.nome) || 'Outra pessoa';
				} else {
					$scope.toast(typeof response.data === 'string' && response.data ? response.data : 'Não foi possível abrir a edição.', 'failed-toast');
				}
			})
			.finally(function() {
				$scope.edicao.abrindo = false;
			});
		};

		$scope.concluirEdicao = function(porInatividade) {
			projetosAPI.liberarTrava().finally(function() {
				pararEdicao();
				if (porInatividade) $scope.toast('A edição foi encerrada por 15 minutos sem atividade. O que já foi salvo continua salvo.', 'failed-toast');
				carregarProjeto();
			});
		};

		// Fechar a aba/sair do site: solta a trava sem esperar resposta (fetch keepalive manda o
		// cabeçalho da trava e o anti-CSRF; sendBeacon não manda cabeçalho). Se não chegar, a trava
		// vence sozinha em poucos minutos.
		var soltarAoSair = function() {
			if (!$scope.edicao.ativa || !$window.fetch) return;
			var cabecalhos = projetosAPI.cabecalhosTrava();
			var xsrf = (document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/) || [])[1];
			if (xsrf) cabecalhos['X-XSRF-TOKEN'] = decodeURIComponent(xsrf);
			$window.fetch('/api/painel/projetos/' + $stateParams.id + '/trava/liberar', { method: 'POST', headers: cabecalhos, keepalive: true, credentials: 'same-origin' });
		};
		$window.addEventListener('pagehide', soltarAoSair);

		// Saiu da tela pelo próprio site (Voltar ao painel etc.).
		$scope.$on('$destroy', function() {
			$window.removeEventListener('pagehide', soltarAoSair);
			if ($scope.edicao.ativa) {
				projetosAPI.liberarTrava();
				pararEdicao();
			}
			projetosAPI.usarProjeto(null);
		});
	});
})();
