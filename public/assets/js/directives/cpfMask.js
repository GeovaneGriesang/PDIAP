(function(){
	'use strict';

	angular
		.module("PDIAP")
		.directive("cpfMask", function ($filter) {
			return {
				require: "ngModel",
				link: function (scope, element, attrs, ctrl) {
					let _formatCpf = function (cpf) {
						cpf = cpf.replace(/[^0-9]+/g, "");
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

					element.bind("keyup", function () {
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
