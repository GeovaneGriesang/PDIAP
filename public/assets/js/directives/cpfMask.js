(function(){
	'use strict';

	angular
		.module("PDIAP")
		.directive("cpfMask", function ($filter) {
			return {
				require: "ngModel",
				link: function (scope, element, attrs, ctrl) {
					let _formatCpf = function (cpf) {
						cpf = (cpf || '').replace(/[^0-9]+/g, "");
						if(cpf.length > 3) {
							cpf = cpf.substring(0,3) + "." + cpf.substring(3);
						}
						if(cpf.length > 7) {
							cpf = cpf.substring(0,7) + "." + cpf.substring(7);
						}
						if(cpf.length > 11) {
							cpf = cpf.substring(0,11) + "-" + cpf.substring(11);
						}
						return cpf;
					};

					// O atributo cpf-mask pode ser uma expressão booleana (ex: só ativa a máscara
					// pra nacionalidade brasileira) ou vazio (sempre ativa - uso antigo). Antes
					// existiam DOIS <input> irmãos com o mesmo name, um mascarado e outro não,
					// alternados por ng-if conforme a nacionalidade - causava bug real de campo
					// sendo limpo/trocado ao trocar de foco (provável interferência de
					// autocomplete do navegador com dois campos de mesmo name no DOM). Agora é
					// um único <input> sempre presente; a máscara liga/desliga sozinha.
					let _ativo = function () {
						if (attrs.cpfMask === '' || attrs.cpfMask === undefined) return true;
						return !!scope.$eval(attrs.cpfMask);
					};

					element.bind("keyup", function () {
						if (!_ativo()) return;
						ctrl.$setViewValue(_formatCpf(ctrl.$viewValue));
						ctrl.$render();
					});

					// ctrl.$parsers.push(function(value) {
					// 	if (value.length === 14) {
					// 		var cpfArray = value.split(/[.\/-]/);
					// 		var model = cpfArray[0]+cpfArray[1]+cpfArray[2]+cpfArray[3];
					// 		return model;
					// 	} else {
					// 		return value;
					// 	}
					// });
				}
			};
		});


})();
