(function(){
	'use strict';

	// Medidor visual de força de senha - regras: 8 a 12 caracteres, com maiúscula,
	// minúscula, número e símbolo (mesma regra validada no servidor, ver
	// controllers/avaliador-controller.js#senhaForte). Usado nas telas de definir/trocar
	// senha do avaliador (não mexe no fluxo de senha do projeto, que é outro/mais antigo).
	//
	// Uso: <div password-strength="senha"></div>, onde "senha" é o nome do model no
	// escopo pai que contém a senha digitada.
	angular
	.module('PDIAP')
	.directive('passwordStrength', function() {
		return {
			restrict: 'A',
			scope: { senha: '=passwordStrength' },
			template:
				'<div class="password-strength">' +
					'<div class="password-strength-regra" data-ng-class="{ok: regras.tamanho}"><md-icon md-svg-src="{{regras.tamanho ? \'check\' : \'close\'}}"></md-icon> 8 a 12 caracteres</div>' +
					'<div class="password-strength-regra" data-ng-class="{ok: regras.maiuscula}"><md-icon md-svg-src="{{regras.maiuscula ? \'check\' : \'close\'}}"></md-icon> Letra maiúscula</div>' +
					'<div class="password-strength-regra" data-ng-class="{ok: regras.minuscula}"><md-icon md-svg-src="{{regras.minuscula ? \'check\' : \'close\'}}"></md-icon> Letra minúscula</div>' +
					'<div class="password-strength-regra" data-ng-class="{ok: regras.numero}"><md-icon md-svg-src="{{regras.numero ? \'check\' : \'close\'}}"></md-icon> Número</div>' +
					'<div class="password-strength-regra" data-ng-class="{ok: regras.simbolo}"><md-icon md-svg-src="{{regras.simbolo ? \'check\' : \'close\'}}"></md-icon> Símbolo (ex: !@#$%)</div>' +
				'</div>',
			link: function(scope) {
				scope.regras = { tamanho:false, maiuscula:false, minuscula:false, numero:false, simbolo:false };
				scope.$watch('senha', function(senha) {
					senha = senha || '';
					scope.regras.tamanho = senha.length >= 8 && senha.length <= 12;
					scope.regras.maiuscula = /[A-Z]/.test(senha);
					scope.regras.minuscula = /[a-z]/.test(senha);
					scope.regras.numero = /[0-9]/.test(senha);
					scope.regras.simbolo = /[^A-Za-z0-9]/.test(senha);
				});
			}
		};
	})
	// Aplicada direto no <input> da nova senha - o widget acima é só visual, essa é
	// quem de fato bloqueia o formulário (senhaForm.$valid) enquanto a senha for fraca,
	// mesma regra de controllers/avaliador-controller.js#senhaForte.
	.directive('senhaForte', function() {
		return {
			restrict: 'A',
			require: 'ngModel',
			link: function(scope, element, attrs, ngModel) {
				ngModel.$validators.senhaForte = function(valor) {
					valor = valor || '';
					return valor.length >= 8 && valor.length <= 12 &&
						/[A-Z]/.test(valor) && /[a-z]/.test(valor) &&
						/[0-9]/.test(valor) && /[^A-Za-z0-9]/.test(valor);
				};
			}
		};
	});
})();
