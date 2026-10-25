(function(){
	'use strict';

	angular
	.module('PDIAPa')
	.controller('adminCtrl', function($scope, $rootScope, $timeout, $window, $mdToast, $mdSidenav, $state, $transitions) {

		// Menu lateral (admin.html): grupo de cada tela - abre sozinho o grupo da tela
		// atual (ao entrar por link/F5 e ao navegar) e destaca o item com ativo().
		var GRUPO_DA_TELA = {
			'master.mostra': 'mostra', 'master.cadastro-documento': 'mostra', 'master.cadastro-mostra': 'mostra', 'master.editar-opcoes-projetos': 'mostra',
			'master': 'projetos', 'master.editar-projetos': 'projetos', 'master.seleciona-aprovados': 'projetos', 'master.presenca-projetos': 'projetos', 'master.premiacao': 'projetos', 'master.relatorios-projetos': 'projetos',
			'master.inscricao-avaliadores': 'avaliacao', 'master.avaliacao-previa': 'avaliacao', 'master.avaliacao-previa-acompanhamento': 'avaliacao', 'master.avaliacao-final': 'avaliacao', 'master.avaliacao-final-acompanhamento': 'avaliacao', 'master.avaliacao-inserir': 'avaliacao', 'master.relatorio-avaliadores': 'avaliacao',
			'master.cadastro-eventos': 'eventos', 'master.cadastro-participantes': 'eventos',
			'master.enviar-email-projetos': 'emails', 'master.enviar-email-avaliadores': 'emails', 'master.enviar-email-premiados': 'emails', 'master.enviar-email-participantes': 'emails', 'master.historico-emails': 'emails',
			'master.pessoas': 'cadastros', 'master.cadastro-escolas': 'cadastros', 'master.cadastro-feiras': 'cadastros',
			'master.administradores': 'sistema', 'master.editar-mostra-atual': 'sistema', 'master.editar-tela-inicial': 'sistema'
		};
		$scope.secao = {};
		function abrirGrupoDaTela(nome) {
			if (GRUPO_DA_TELA[nome]) $scope.secao[GRUPO_DA_TELA[nome]] = true;
		}
		abrirGrupoDaTela($state.current.name);
		var pararDeOuvir = $transitions.onSuccess({}, function(trans) { abrirGrupoDaTela(trans.to().name); });
		$scope.$on('$destroy', pararDeOuvir);
		$scope.ativo = function(nome) {
			return $state.is(nome);
		};

		// Volta pro painel pessoal (/painel) - mesma sessão, sem sair.
		$scope.voltarAoPainel = function() {
			$window.location.href = '/painel';
		};

		$scope.toggleSidenav = function(menu) {
			$mdSidenav(menu).toggle();
		};

		// Inscrição pública (/projetos/inscricao) é outro app Angular (módulo PDIAP,
		// não PDIAPa) - não dá pra navegar com ui-sref, é uma nova aba de verdade.
		$scope.abrirInsercaoProjeto = function() {
			$window.open('/projetos/inscricao', '_blank');
		};

		// Ranking (3 melhores projetos por eixo, calculado a partir das notas lançadas em
		// Avaliação) mora num terceiro app Angular (módulo PDIAPav, public/admin/avaliacao/),
		// mesmo caso do abrirInsercaoProjeto acima - nova aba de verdade. Usar
		// href+target="_blank" direto no md-list-item não funciona: a diretiva mdListItem só
		// copia um conjunto fixo de atributos (href, ng-href, ui-sref, ng-click...) pro <a>
		// que ela gera por baixo dos panos, e "target" não está nessa lista.
		$scope.abrirRanking = function() {
			$window.open('/ranking/2016', '_blank');
		};

		$scope.toast = function(message,tema) {
			var toast = $mdToast.simple().textContent(message).action('✖').position('top right').theme(tema).hideDelay(10000);
			$mdToast.show(toast);
		};

		// "#content" é quem realmente rola (ver admin.html) - cada view (relatorios,
		// cadastro-escolas etc.) troca dentro dele, então "voltar ao topo" é sempre
		// zerar o scrollTop desse container, não da janela.
		$scope.voltarAoTopo = function() {
			var content = document.getElementById('content');
			if (content) content.scrollTop = 0;
		};

		// Cada view traz seu(s) próprio(s) md-toolbar.toolbar-admin no topo (título +,
		// em várias telas, uma segunda barra de ações/filtro). Embrulha os que forem
		// filhos diretos consecutivos de section[role="main"] numa div sticky, assim
		// ficam fixos ao rolar - sem precisar duplicar isso em cada arquivo de view.
		// Refeito a cada troca de view porque o ui-view substitui o conteúdo inteiro.
		function fixarToolbars() {
			var content = document.getElementById('content');
			if (!content) return;
			var main = content.querySelector('section[role="main"]');
			if (!main) return;
			if (main.querySelector(':scope > .master-header-fixo')) return;

			var toolbars = [];
			var node = main.firstElementChild;
			while (node && node.tagName === 'MD-TOOLBAR' && node.classList.contains('toolbar-admin')) {
				toolbars.push(node);
				node = node.nextElementSibling;
			}
			if (toolbars.length === 0) return;

			var wrapper = document.createElement('div');
			wrapper.className = 'master-header-fixo';
			main.insertBefore(wrapper, toolbars[0]);
			toolbars.forEach(function(t) { wrapper.appendChild(t); });
		}

		$rootScope.$on('$viewContentLoaded', function() {
			$timeout(fixarToolbars, 0);
		});

	});
})();
