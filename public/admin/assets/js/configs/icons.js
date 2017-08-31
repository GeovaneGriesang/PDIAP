(function(){
	'use strict';

	angular
	.module('PDIAPa')
	.config(function($mdIconProvider, $mdThemingProvider) {
		$mdThemingProvider.theme('error')
		.primaryPalette('red');
		$mdThemingProvider.theme('padrao')
		.primaryPalette('grey');
		$mdIconProvider
		.defaultIconSet('admin/assets/mdi.svg')
	});
})();
