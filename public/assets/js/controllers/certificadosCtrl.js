(function(){
	'use strict';

	angular
	.module('PDIAP')
	.controller('certificadosCtrl', function($scope, projetosAPI) {

		var somaHora = function(horaInicio, horaSomada) {
			let horaIni = horaInicio.split(':');
			let horaSom = horaSomada.split(':');
			let horasTotal = parseInt(horaIni[0], 10) + parseInt(horaSom[0], 10);
			let minutosTotal = parseInt(horaIni[1], 10) + parseInt(horaSom[1], 10);
			if(minutosTotal === 60){
				minutosTotal -= 60;
				horasTotal += 1;
			}
			if (minutosTotal.toString().length === 1) {
				minutosTotal = '0'+minutosTotal;
			}
			return horasTotal + ":" + minutosTotal;
		};

		$scope.consultarCertificado = function(token) {
			projetosAPI.postConferirCertificado(token)
			.success(function(data) {
				$scope.texto = '';
				if (data[0].tipo === 'Avaliador') {
					$scope.texto = '<b>Nome:</b> '+data[0].nome+'</br><b>Tipo:</b> '+data[0].tipo+'</br><b>CPF:</b> '+data[0].cpf;
				}
				else if (data[0].tipo === 'Participante') {
					let evts1 = '';
					let ch1 = '0:00';
					let ch2 = '0:00';
					let evts2 = '';
					angular.forEach(data[0].eventos, function (value, key){
						if (data[0].tokenOficinas === token && value.tipo === "Oficina") {
							if (evts1 === '') {
								evts1 = value.titulo;
							} else {
								evts1 = evts1+', '+value.titulo;
							}
							ch1 = somaHora(value.cargaHoraria,ch1);
						} else if (data[0].tokenSaberes === token && value.tipo === "Seminário Saberes Docentes") {
							if (evts2 === '') {
								evts2 = value.titulo;
								// eventos = value.titulo+': '+value.cargaHoraria+' hora (s).\n';
							} else {
								evts2 = evts2+', '+value.titulo;
								// eventos = eventos + value.titulo+': '+value.cargaHoraria+' hora (s).\n';
							}
							ch2 = somaHora(value.cargaHoraria,ch2);
						}
					});
					if (evts1 !== '') {
						$scope.texto = '<b>Nome:</b> '+data[0].nome+'</br><b>Tipo:</b> '+data[0].tipo+'</br><b>CPF:</b> '+data[0].cpf+'</br><b>Oficina(s):</b> '+evts1+'</br><b>Carga Horária total:</b> '+ch1+' hora(s)';
					}
					if (evts2 !== '') {
						$scope.texto = '<b>Nome:</b> '+data[0].nome+'</br><b>Tipo:</b> '+data[0].tipo+'</br><b>CPF:</b> '+data[0].cpf+'</br><b>Evento(s):</b> '+evts2+'</br><b>Carga Horária total:</b> '+ch2+' hora(s)';
					}
				}
				else if (data[0].tipo === 'ProjetoAluno') {
					$scope.texto = '<b>Nome:</b> '+data[0].integrantes.nome+'</br><b>Tipo:</b> Apresentação de projeto</br><b>CPF:</b> '+data[0].integrantes.cpf+'</br><b>Projeto:</b> '+data[0].integrantes.nomeProjeto;
				}
				else if (data[0].tipo === 'ProjetoOrientador') {
					$scope.texto = '<b>Nome:</b> '+data[0].integrantes.nome+'</br><b>Tipo:</b> Orientação de projeto</br><b>CPF:</b> '+data[0].integrantes.cpf+'</br><b>Projeto:</b> '+data[0].integrantes.nomeProjeto;
				}
				else if (data[0].tipo === 'Evento') {
					if (data[0].evento.tipo === 'Oficina') {
						$scope.texto = '<b>Nome:</b> '+data[0].evento.responsavel+'</br><b>Tipo:</b> Oficineiro</br><b>CPF:</b> '+data[0].evento.cpf+'</br><b>Evento:</b> '+data[0].evento.titulo+'</br><b>Carga Horária:</b> '+data[0].evento.cargaHoraria;
					}
					else if (data[0].evento.tipo === 'Seminário Saberes Docentes') {
						$scope.texto = '<b>Nome:</b> '+data[0].evento.responsavel+'</br><b>Tipo:</b> Conferencista</br><b>CPF:</b> '+data[0].evento.cpf+'</br><b>Evento:</b> '+data[0].evento.titulo+'</br><b>Carga Horária:</b> '+data[0].evento.cargaHoraria;
					}
				}
				else if (data[0].tipo === 'Premiado') {
					$scope.texto = '<b>Projeto:</b> '+data[0].projeto.nomeProjeto+'</br><b>Tipo:</b> Premiação</br><b>Categoria:</b> '+data[0].projeto.categoria+'</br><b>Eixo:</b> '+data[0].projeto.eixo+'</br><b>Colocação:</b> '+data[0].projeto.colocacao+'º lugar';
				}
			})
			.error(function(status) {
				console.log('Error: '+status);
			});
		}

	});
})();
