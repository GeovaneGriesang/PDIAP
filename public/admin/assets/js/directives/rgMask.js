(function(){
	'use strict';

	angular
		.module("PDIAPa")
		.directive("rgMask", function ($filter) {
			return {
				require: "ngModel",
				link: function (scope, element, attrs, ctrl) {
					let _formatRg = function (rg) {
						rg = rg.replace(/[^0-9]+/g, "");
						return rg;
					};

					element.bind("keyup", function () {
						ctrl.$setViewValue(_formatRg(ctrl.$viewValue));
						ctrl.$render();
					});

				}
			};
		});


})();
