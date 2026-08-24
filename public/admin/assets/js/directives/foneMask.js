(function(){
	'use strict';

	angular
		.module("PDIAPa")
		.directive("foneMask", function ($filter) {
			return {
				require: "ngModel",
				link: function (scope, element, attrs, ctrl) {
					let _formatFone = function (fone) {
						fone = (fone || '').replace(/[^0-9]+/g, "");
						if(fone.length > 0) {
							fone = "(" + fone.substring(0);
						}
						if(fone.length > 3) {
							fone = fone.substring(0,3) + ")" + fone.substring(3);
						}
						if(fone.length > 4) {
							fone = fone.substring(0,4) + " " + fone.substring(4);
						}
						if(fone.length > 9) {
							fone = fone.substring(0,9) + "-" + fone.substring(9);
						}
						return fone;
					};

					// Mesmo esquema do cpf-mask (ver cpfMask.js) - atributo vira uma expressão
					// booleana opcional pra ligar/desligar a máscara sem precisar de dois <input>
					// irmãos com o mesmo name alternados por ng-if (causava bug de campo sendo
					// limpo/trocado ao mudar de foco).
					let _ativo = function () {
						if (attrs.foneMask === '' || attrs.foneMask === undefined) return true;
						return !!scope.$eval(attrs.foneMask);
					};

					element.bind("keyup", function () {
						if (!_ativo()) return;
						ctrl.$setViewValue(_formatFone(ctrl.$viewValue));
						ctrl.$render();
					});

					// ctrl.$parsers.push(function(value) {
					// 	if (value.length === 14) {
					// 		var foneArray = value.split(/[^0-9]/);
					// 		var model = foneArray[1]+foneArray[3]+foneArray[4];
					// 		return model;
					// 	} else {
					// 		return value;
					// 	}
					// });
				}
			};
		});


})();
