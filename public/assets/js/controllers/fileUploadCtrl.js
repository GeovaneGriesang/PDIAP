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

				let upload = Upload.upload({
					url: '/projetos/upload',
					method: 'POST',
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
				}, function (response) {
					$scope.progresso = 'Status';
					$scope.status = 'window-close';
					$scope.statusColor = '#f44336';
					$scope.statusText = 'Falhou';
					$scope.toast('Falha ao enviar o relatório','failed-toast');
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
