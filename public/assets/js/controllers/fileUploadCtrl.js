(function(){
	'use strict';

	angular
	.module('PDIAP')
	.controller('fileUploadCtrl', ['$scope', 'Upload', '$mdToast', 'projetosAPI', function ($scope, Upload, $mdToast, projetosAPI) {

		$scope.toast = function(message,tema) {
			var toast = $mdToast.simple().textContent(message).action('✖').position('top right').theme(tema).hideDelay(10000);
			$mdToast.show(toast);
		};

		$scope.uploadFile = function(file, errFiles) {
			$scope.f = file;
			$scope.errFile = errFiles && errFiles[0];
			$scope.progresso = 'Progresso';
			// $scope.status = undefined;
			delete $scope.status;

			if (file) {

				// Relatório do projeto aberto no painel, com o código da trava de edição (ver
				// projetosAPI.usarProjeto/definirTrava e routes/painel-projetos.js).
				let upload = Upload.upload({
					url: projetosAPI.urlRelatorio(),
					method: 'POST',
					headers: projetosAPI.cabecalhosTrava(),
					data: { file: file }
				});

				$scope.calcSize = file.size/1000;
				$scope.calcSize = parseFloat($scope.calcSize).toFixed(2);

				upload.then(function (response) {
					$scope.progresso = 'Status';
					$scope.status = 'check';
					$scope.statusColor = '#43a047';
					$scope.statusText = 'Enviado';
					$scope.toast('Relatório enviado com sucesso!','success-toast');
					if ($scope.carregarProjeto) $scope.carregarProjeto();
				}, function (response) {
					$scope.progresso = 'Status';
					$scope.status = 'window-close';
					$scope.statusColor = '#f44336';
					$scope.statusText = 'Falhou';
					$scope.toast(typeof response.data === 'string' && response.data ? response.data : 'Falha ao enviar o relatório','failed-toast');
					if (response.status > 0) {
						console.log(response.status + ': ' + response.data);
					}
				}, function (evt) {
					file.progress = Math.min(100, parseInt(100.0 * evt.loaded / evt.total));
				});
			}
		}

	}]);
})();
