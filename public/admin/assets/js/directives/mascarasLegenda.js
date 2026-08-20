(function(){
	'use strict';

	// Legenda de máscaras (¨chave) usada nos textos de e-mail e de certificado: mostra as
	// máscaras disponíveis como chips verdes clicáveis (mesmo espírito visual dos chips de
	// palavras-chave do cadastro de projetos) que, ao clicar, inserem a máscara no campo de
	// texto logo em seguida no HTML (textarea ou input dentro do elemento seguinte). Fica
	// ANTES do campo de propósito - colocar depois gerava confusão visual, já que a legenda
	// ficava colada no campo seguinte e parecia pertencer a ele, não ao campo anterior.
	// Um ícone de ajuda ao lado explica o funcionamento e lista o significado de cada máscara.
	//
	// Uso: <div mascaras-legenda="[{chave:'nome',desc:'Nome do destinatário'}, ...]"></div>
	// logo antes do <md-input-container> (ou elemento equivalente) que contém o campo alvo.
	angular
	.module('PDIAPa')
	.directive('mascarasLegenda', function($mdDialog) {
		return {
			restrict: 'A',
			scope: { mascaras: '=mascarasLegenda' },
			template:
				'<div class="mascaras-legenda">' +
					'<span class="mascaras-legenda-chips">' +
						'<span class="mascara-chip" data-ng-repeat="m in mascaras track by m.chave" data-ng-click="inserir(m.chave)" title="Clique para inserir">&#168;{{m.chave}}</span>' +
					'</span>' +
					'<md-icon md-svg-src="help-circle" class="mascara-ajuda-icon" data-ng-click="ajuda($event)" aria-label="Ajuda sobre máscaras"></md-icon>' +
				'</div>',
			link: function(scope, element) {
				function campoAlvo() {
					var seguinte = element[0].nextElementSibling;
					if (!seguinte) return null;
					return seguinte.querySelector('textarea, input') || (seguinte.matches && seguinte.matches('textarea, input') ? seguinte : null);
				}

				scope.inserir = function(chave) {
					var campo = campoAlvo();
					if (!campo) return;
					var mascara = '¨' + chave;
					var inicio = campo.selectionStart != null ? campo.selectionStart : campo.value.length;
					var fim = campo.selectionEnd != null ? campo.selectionEnd : campo.value.length;
					var valor = campo.value || '';
					campo.value = valor.slice(0, inicio) + mascara + valor.slice(fim);
					var novaPosicao = inicio + mascara.length;
					campo.focus();
					campo.selectionStart = campo.selectionEnd = novaPosicao;
					angular.element(campo).triggerHandler('input');
				};

				scope.ajuda = function(ev) {
					var lista = scope.mascaras.map(function(m) {
						return '¨' + m.chave + ' — ' + m.desc;
					}).join('\n');
					$mdDialog.show(
						$mdDialog.alert()
						.parent(angular.element(document.body))
						.clickOutsideToClose(true)
						.title('Como usar as máscaras')
						.textContent(
							'Clique em uma máscara (chip verde) para inseri-la no campo de texto logo abaixo, na posição do cursor. ' +
							'Ao salvar ou enviar, cada máscara é substituída automaticamente pelo dado correspondente de quem vai receber ' +
							'o e-mail ou o certificado.\n\n' + lista
						)
						.ok('Entendi')
						.targetEvent(ev)
					);
				};
			}
		};
	});
})();
