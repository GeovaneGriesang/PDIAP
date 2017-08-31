(function(){
	'use strict';

	angular
	.module('PDIAPav')
	.config(function($mdIconProvider, $mdThemingProvider) {
		$mdThemingProvider.theme('error')
		.primaryPalette('red');
		$mdThemingProvider.theme('padrao')
		.primaryPalette('grey');
		$mdIconProvider
		.defaultIconSet('admin/avaliacao/assets/mdi.svg')
	});
})();
