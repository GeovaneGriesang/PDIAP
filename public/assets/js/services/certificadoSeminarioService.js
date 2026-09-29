(function(){
	'use strict';

	angular
	.module('PDIAP')
	.factory('certificadoSeminarioService', function() {

		// Soma duas cargas horárias "H:MM" - mesma lógica espelhada em
		// utils/certificadoSeminario.js (servidor).
		function somaHora(horaInicio, horaSomada) {
			var horaIni = horaInicio.split(':');
			var horaSom = horaSomada.split(':');
			var horasTotal = parseInt(horaIni[0], 10) + parseInt(horaSom[0], 10);
			var minutosTotal = parseInt(horaIni[1], 10) + parseInt(horaSom[1], 10);
			if (minutosTotal === 60) {
				minutosTotal -= 60;
				horasTotal += 1;
			}
			if (minutosTotal.toString().length === 1) {
				minutosTotal = '0' + minutosTotal;
			}
			return horasTotal + ':' + minutosTotal;
		}

		// Filtra as entradas tipo:'Seminário' de um array de eventos de Participante e devolve o
		// texto pro verso do certificado (multi-linha) + carga horária total. Substitui a lógica
		// antes triplicada em homeCtrl.js#buscarCPF e certificadosCtrl.js#consultarCertificado -
		// o percentual NÃO entra aqui, vem sempre pronto do servidor (ver
		// utils/certificadoSeminario.js#agregarSeminario), porque depende de contar o total de
		// palestras do Seminário, dado que a página pública não tem.
		function agregarEventos(eventosParticipante) {
			var doTipo = (eventosParticipante || []).filter(function(e) { return e.tipo === 'Seminário'; });
			var cargaHoraria = '0:00', textoVerso = '', titulos = [];
			doTipo.forEach(function(e) {
				textoVerso += e.titulo + ': ' + e.cargaHoraria + ' hora (s).\n';
				titulos.push(e.titulo);
				cargaHoraria = somaHora(e.cargaHoraria, cargaHoraria);
			});
			return { textoVerso: textoVerso, cargaHoraria: cargaHoraria, titulos: titulos };
		}

		return { agregarEventos: agregarEventos, somaHora: somaHora };
	});
})();
