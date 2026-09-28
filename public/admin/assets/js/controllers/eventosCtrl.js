(function(){
	'use strict';

	angular
	.module('PDIAPa')
	.controller('eventosCtrl', function($scope, $rootScope, $timeout, $mdDialog, $mdToast, adminAPI) {

		$scope.toast = function(message,tema) {
			var toast = $mdToast.simple().textContent(message).action('✖').position('top right').theme(tema).hideDelay(10000);
			$mdToast.show(toast);
		};

		$scope.eventos = [];
		$scope.dynamicFields = [{nome:'nome1', cpf:'cpf1'}];

		$scope.btnAdd = true;
		$scope.count = 1;

		// null = formulário em modo "novo evento"; com um _id, o formulário está
		// carregado pra editar aquele evento (troca o texto/comportamento do botão
		// Salvar - ver editarEvento/cancelarEdicao/cadastrarEvento).
		$scope.editando = null;

		// A Mostra selecionada é compartilhada com as demais telas do admin ($rootScope.mostraId,
		// padrão = Mostra atual - ver definirMostraPadrao em routes/ui-routes.js). O evento
		// pertence a uma Mostra (feiraId), não só a um ano: duas Mostras no mesmo ano (ex: X e XI
		// MOVACI) não misturam eventos. Evento antigo, sem feiraId, cai no ano (pertenceAMostra).
		// O <md-select>+ng-repeat de Mostras, ao ser preenchido de forma assíncrona, religa cada
		// <md-option> e reescreve o ng-model no processo (bug conhecido do Angular Material com
		// ng-repeat dentro de md-select) - guarda o valor persistido ANTES e só carrega a lista
		// depois de reaplicá-lo.
		$scope.mostras = [];

		let mostraIdPersistido = $rootScope.mostraId;
		let resolverMostraSelecionada = function() {
			$rootScope.mostraSelecionada = ($scope.mostras || []).filter(function(m) { return m._id === $rootScope.mostraId; })[0];
			$rootScope.ano = $rootScope.mostraSelecionada ? $rootScope.mostraSelecionada.ano : $rootScope.ano;
		};

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
			.then(function(response) {
				angular.forEach(response.data, function (value, key) {
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
					//dateFormat = value.data;

					var ano = new Date(value.createdAt).getFullYear();
					if(adminAPI.pertenceAMostra(value, $rootScope.mostraSelecionada)){
						let evento = ({
							_id: value._id,
							tipo: value.tipo,
							titulo: value.titulo,
							cargaHoraria: value.cargaHoraria,
							data: dateFormat,
							responsavel: responsaveis,
							createdAt: ano,
							// Registro completo (com o array de responsável de verdade, nome+cpf
							// por pessoa) - a linha da lista só mostra o resumo em texto acima,
							// mas editarEvento() precisa dos dados originais pra preencher o
							// formulário de novo.
							raw: value
						});
						// Antes só entrava se o _id ainda não estivesse na lista - então editar
						// um evento gravava certo no banco, mas a linha na tela continuava com o
						// título/data/responsável antigos até recarregar a página inteira (o
						// "de novo" nunca substituía, só "de novo" mesmo). Atualiza no lugar
						// quando já existe, em vez de ignorar.
						var index = $scope.eventos.map(function(e) { return e._id; }).indexOf(value._id);
						if (index === -1) {
							$scope.eventos.push(evento);
						} else {
							$scope.eventos[index] = evento;
						}
					}
				});
			}, function(response) {
				console.log("Error: "+response.data);
			});
		}
		adminAPI.getMostras()
		.then(function(response) {
			var mostras = response.data;
			$scope.mostras = mostras;
			$timeout(function() {
				if (mostraIdPersistido) $rootScope.mostraId = mostraIdPersistido;
				else if (!$rootScope.mostraId && mostras.length) $rootScope.mostraId = mostras[0]._id;
				resolverMostraSelecionada();
				mostraEventos();
			});
		}, function(response) {
			console.log('Error: '+response.data);
			$rootScope.ano = $rootScope.ano || new Date().getFullYear();
			mostraEventos();
		});

		$scope.recarregar = function(){
			resolverMostraSelecionada();
			$scope.eventos = [];
			$scope.dynamicFields = [{nome:'nome1', cpf:'cpf1'}];

			$scope.btnAdd = true;
			$scope.count = 1;
			$scope.editando = null;

			mostraEventos();
		}

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

			if ($scope.editando) {
				let evtAtualizado = ({
					id: $scope.editando,
					titulo: evento.titulo,
					tipo: evento.tipo,
					cargaHoraria: hh+":"+mm,
					data: dia+"/"+mes+"/"+ano,
					responsavel: responsavel,
					// Evento antigo (sem Mostra) passa a pertencer à Mostra em que está sendo editado.
					feiraId: $rootScope.mostraId
				});
				adminAPI.putAtualizaEvento(evtAtualizado)
				.then(function(response) {
					$scope.toast('Evento atualizado com sucesso!','success-toast');
					mostraEventos();
					resetForm();
				}, function(response) {
					$scope.toast('Falha.','failed-toast');
					console.log("Error: "+response.data);
				});
				return;
			}

			// Cadastra o evento na Mostra selecionada no filtro do cabeçalho (feiraId), com o ano
			// dela em createdAt, em vez de sempre no ano atual (permite inserir eventos de
			// Mostras anteriores).
			let createdAt = $rootScope.ano ? new Date(new Date().setFullYear($rootScope.ano)) : Date.now();

			let evt = ({
				titulo: evento.titulo,
				tipo: evento.tipo,
				cargaHoraria: hh+":"+mm,
				data: dia+"/"+mes+"/"+ano,
				responsavel: responsavel,
				createdAt: createdAt,
				feiraId: $rootScope.mostraId
			});

			adminAPI.postEvento(evt)
			.then(function(response) {
				$scope.toast('Evento cadastrado com sucesso!','success-toast');
				mostraEventos();
				resetForm();
			}, function(response) {
				$scope.toast('Falha.','failed-toast');
				console.log("Error: "+response.data);
			});
		};

		// Preenche o mesmo formulário de "Novo Evento" com os dados de um evento já
		// existente (data/carga horária viram Date - mesmo tipo que os <input date>/<input
		// time> do formulário esperam - convertendo de volta o formato salvo em
		// cadastrarEvento) e troca o botão Salvar pra modo edição (ver cadastrarEvento).
		$scope.editarEvento = function(evento) {
			var raw = evento.raw;

			var partesData = raw.data.split('/');
			var dataObj = new Date(Number(partesData[2]), Number(partesData[1]) - 1, Number(partesData[0]));

			var partesHora = raw.cargaHoraria.split(':');
			var horaObj = new Date(1970, 0, 1, Number(partesHora[0]), Number(partesHora[1]));

			$scope.evento = {
				titulo: raw.titulo,
				tipo: raw.tipo,
				data: dataObj,
				cargaHoraria: horaObj,
				responsavel: raw.responsavel.map(function(r) { return { nome: r.nome, cpf: r.cpf }; })
			};
			$scope.dynamicFields = raw.responsavel.map(function(r, i) { return { nome: 'nome'+(i+1), cpf: 'cpf'+(i+1) }; });
			$scope.count = raw.responsavel.length;
			$scope.editando = evento._id;

			// A janela pode estar rolada até a lista, lá embaixo - volta pro topo, onde
			// está o formulário que acabou de ser preenchido pra edição.
			window.scrollTo(0, 0);
		};

		$scope.cancelarEdicao = function() {
			resetForm();
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
				.then(function(response) {
					$scope.toast('Evento removido com sucesso!','success-toast');
					var index = $scope.eventos.map(function(e) { return e._id; }).indexOf(id);
					if (index !== -1) {
						$scope.eventos.splice(index, 1);
					}
				}, function(response) {
					$scope.toast('Falha.','failed-toast');
					console.log("Error: "+response.data);
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
			$scope.editando = null;
			$scope.dynamicFields = [{nome:'nome1', cpf:'cpf1'}];
		};
	});
})();
