(function(){
	'use strict';

	angular
	.module('PDIAPa')
	.controller('eventosCtrl', function($scope, $mdDialog, $mdToast, adminAPI) {

		$scope.toast = function(message,tema) {
			var toast = $mdToast.simple().textContent(message).action('✖').position('top right').theme(tema).hideDelay(10000);
			$mdToast.show(toast);
		};

		$scope.eventos = [];
		$scope.dynamicFields = [{nome:'nome1', cpf:'cpf1'}];

		$scope.btnAdd = true;
		$scope.count = 1;

		$scope.addResponsavel = function() {
			$scope.count++;
			$scope.dynamicFields.push({nome:'nome'+$scope.count, cpf:'cpf'+$scope.count});
		};

		$scope.removeResponsavel = function(index) {
			$scope.dynamicFields.splice(index, 1);
			$scope.count--;
		};

		let mostraEventos = function() {
			adminAPI.getEventos()
			.success(function(eventos) {
				angular.forEach(eventos, function (value, key) {
					var index = $scope.eventos.map(function(e) { return e._id; }).indexOf(value._id);
					if (index === -1) {
						let responsaveis = "";
						let dateFormat = "";
						angular.forEach(value.responsavel, function (value, key) {
							if (responsaveis !== "") {
								responsaveis = responsaveis+", "+value.nome;
							} else {
								responsaveis = value.nome;
							}
						});
						dateFormat = value.data.slice(0,-5);

						let evento = ({
							_id: value._id,
							tipo: value.tipo,
							titulo: value.titulo,
							cargaHoraria: value.cargaHoraria,
							data: dateFormat,
							responsavel: responsaveis
						});
						$scope.eventos.push(evento);
					}
				});
			})
			.error(function(status) {
				console.log("Error: "+status);
			});
		}
		$scope.mostraEventos = mostraEventos();

		$scope.cadastrarEvento = function(evento) {

			let hh = evento.cargaHoraria.getHours();
			let mm = evento.cargaHoraria.getMinutes();
			if (mm.toString().length == 1)
			mm = "0"+mm;

			let dia = evento.data.getDate();
			if (dia.toString().length == 1)
			dia = "0"+dia;
			let mes = evento.data.getMonth()+1;
			if (mes.toString().length == 1)
			mes = "0"+mes;
			let ano = evento.data.getFullYear();

			var responsavel = [];
			for (var i in evento.responsavel) {
				responsavel.push(evento.responsavel[i]);
			}

			let evt = ({
				titulo: evento.titulo,
				tipo: evento.tipo,
				cargaHoraria: hh+":"+mm,
				data: dia+"/"+mes+"/"+ano,
				responsavel: responsavel
			});

			adminAPI.postEvento(evt)
			.success(function(data) {
				$scope.toast('Evento cadastrado com sucesso!','success-toast');
				mostraEventos();
				resetForm();
			})
			.error(function(status) {
				$scope.toast('Falha.','failed-toast');
				console.log("Error: "+status);
			});
		};

		$scope.removerEvento = function(ev,id,titulo) {
			var confirm = $mdDialog.confirm()
			.textContent('Deseja remover o evento '+titulo+'?')
			.ariaLabel('Remover evento')
			.targetEvent(ev)
			.ok('Sim')
			.cancel('Não');
			$mdDialog.show(confirm).then(function() {
				adminAPI.putRemoveEvento(id)
				.success(function(data) {
					$scope.toast('Evento removido com sucesso!','success-toast');
					var index = $scope.eventos.map(function(e) { return e._id; }).indexOf(id);
					if (index !== -1) {
						$scope.eventos.splice(index, 1);
					}
				})
				.error(function(status) {
					$scope.toast('Falha.','failed-toast');
					console.log("Error: "+status);
				});
			}, function() {});
		};

		$scope.visualizarDetalhes = function(evento,ev1) {
			$mdDialog.show({
				controller: function dialogController($scope, $mdDialog) {
					$scope.details = evento;
					$scope.hide = function() {
						$mdDialog.hide();
					};
					$scope.cancel = function() {
						$mdDialog.cancel();
					};
				},
				templateUrl: 'admin/views/details.eventos.html',
				parent: angular.element(document.body),
				targetEvent: ev1,
				clickOutsideToClose: false,
				fullscreen: true // Only for -xs, -sm breakpoints.
			});
		};

		let resetForm = function() {
			delete $scope.evento;
			$scope.eventosForm.$setPristine();
			$scope.eventosForm.$setUntouched();
			$scope.btnAdd = true;
			$scope.count = 1;
			$scope.dynamicFields = [{nome:'nome1', cpf:'cpf1'}];
		};
	});
})();
