(function(){
	'use strict';

	angular
		.module("PDIAP")
		.directive("limitPalavra", function ($filter) {
			return {
				require: "ngModel",
				link: function (scope, element, attrs, ctrl) {
					let _formatPala = function (pala) {
						if (scope.palavrasChave.length >= 5) {
							scope.palavrasChave.splice(5,1);
						}
						return scope.palavrasChave;
					};

					element.bind("keyup", function () {
						ctrl.$setViewValue(_formatPala(ctrl.$viewValue));
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
