(function(){
	'use strict';

	angular
		.module("PDIAPa")
		.directive("foneMask", function ($filter) {
			return {
				require: "ngModel",
				link: function (scope, element, attrs, ctrl) {
					let _formatFone = function (fone) {
						fone = fone.replace(/[^0-9]+/g, "");
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

					element.bind("keyup", function () {
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
