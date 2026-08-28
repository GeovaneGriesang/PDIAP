(function(){
	'use strict';

	angular
	.module('PDIAPa')
	.controller('adminCtrl', function($scope, $rootScope, $timeout, $mdToast, $mdSidenav) {

		$scope.toggleSidenav = function(menu) {
			$mdSidenav(menu).toggle();
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
