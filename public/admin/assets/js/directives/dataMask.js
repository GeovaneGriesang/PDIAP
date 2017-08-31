(function(){
	'use strict';

	angular
	.module("PDIAPa")
	.directive("nascMask", function ($filter) {
		return {
			require: "ngModel",
			link: function (scope, element, attrs, ctrl) {
				let _formatNasc = function (nasc) {
					nasc = nasc.replace(/[^0-9]+/g, "");
					if(nasc.length > 2) {
						nasc = nasc.substring(0,2) + "/" + nasc.substring(2);
					}
					if(nasc.length > 5) {
						nasc = nasc.substring(0,5) + "/" + nasc.substring(5);
					}
					return nasc;
				};

				element.bind("keyup", function () {
					ctrl.$setViewValue(_formatNasc(ctrl.$viewValue));
					ctrl.$render();
				});
			}
		};
	});
})();
