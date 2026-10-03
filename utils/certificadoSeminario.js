'use strict';

const Evento = require('../models/evento-schema');

// Soma duas cargas horárias "H:MM" - mesma lógica antes triplicada em
// public/assets/js/controllers/homeCtrl.js, routes/participantes.js e
// public/assets/js/controllers/certificadosCtrl.js.
function somaHora(horaInicio, horaSomada) {
	let horaIni = horaInicio.split(':');
	let horaSom = horaSomada.split(':');
	let horasTotal = parseInt(horaIni[0], 10) + parseInt(horaSom[0], 10);
	let minutosTotal = parseInt(horaIni[1], 10) + parseInt(horaSom[1], 10);
	if (minutosTotal === 60) {
		minutosTotal -= 60;
		horasTotal += 1;
	}
	if (minutosTotal.toString().length === 1) {
		minutosTotal = '0' + minutosTotal;
	}
	return horasTotal + ':' + minutosTotal;
}

// Junta datas de evento ("dd/mm/yyyy" ou "dd/mm/yyyy, dd/mm/yyyy" - evento de vários dias, ver
// public/admin/assets/js/controllers/eventosCtrl.js) num texto só pro certificado (máscara
// ¨data): sem repetição, em ordem cronológica, "a, b e c". Aceita string ou array de strings.
// Espelhada em public/assets/js/services/certificadoSeminarioService.js (navegador).
function juntaDatas(datas) {
	let lista = [].concat(datas || []).join(', ').split(',')
		.map((s) => s.trim()).filter((s) => s !== '');
	let unicas = lista.filter((s, i) => lista.indexOf(s) === i);
	let chave = (s) => s.split('/').reverse().join('');
	unicas.sort((a, b) => (chave(a) < chave(b) ? -1 : chave(a) > chave(b) ? 1 : 0));
	if (unicas.length <= 1) return unicas.join('');
	return unicas.slice(0, -1).join(', ') + ' e ' + unicas[unicas.length - 1];
}

// Agrega os eventos tipo:'Seminário' de UM participante: soma de carga horária, texto pro verso
// do certificado e percentual de frequência (frequentadas / total cadastrado pro MESMO
// Seminario). Participante/evento sem seminarioId gravado (dado anterior à migração e não
// casado com certeza, ou ano sem Seminario cadastrado) cai em 100% - não existe forma de saber
// o total real, então não trava nem inventa um "quase certo" (decisão de produto, ver plano da
// frente "Seminário genérico").
async function agregarSeminario(eventosParticipante) {
	let doTipo = (eventosParticipante || []).filter((e) => e.tipo === 'Seminário');
	if (doTipo.length === 0) return null;

	let cargaHoraria = '0:00';
	let eventosTexto = '';
	doTipo.forEach((e) => {
		eventosTexto += e.titulo + ': ' + e.cargaHoraria + ' hora (s).\n';
		cargaHoraria = somaHora(e.cargaHoraria, cargaHoraria);
	});

	let comSeminario = doTipo.find((e) => e.seminarioId);
	let percentual = 100;
	if (comSeminario) {
		let total = await Evento.countDocuments({ tipo: 'Seminário', seminarioId: comSeminario.seminarioId });
		if (total > 0) percentual = Math.min(100, Math.round((doTipo.length / total) * 100));
	}

	return { cargaHoraria, eventos: eventosTexto, percentual, data: juntaDatas(doTipo.map((e) => e.data)) };
}

module.exports = { somaHora, juntaDatas, agregarSeminario };
