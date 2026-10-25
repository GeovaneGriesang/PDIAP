(function(){
	'use strict';

	angular
	.module('PDIAP')
	.config(function($mdIconProvider, $mdThemingProvider) {
		// Tema padrão no verde da MOVACI (antes: índigo/rosa do Angular Material) - ver assets/css/botoes.css.
		$mdThemingProvider.theme('default')
		.primaryPalette('green', { 'default': '800' })
		.accentPalette('green', { 'default': '600' })
		.warnPalette('red');
		$mdThemingProvider.theme('error')
		.primaryPalette('red');
		$mdThemingProvider.theme('padrao')
		.primaryPalette('grey');
		$mdIconProvider
		.defaultIconSet('assets/mdi.svg')
	});
})();
