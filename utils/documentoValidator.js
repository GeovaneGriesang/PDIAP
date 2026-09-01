'use strict';

// Validação de documento de identificação e telefone SEM depender da nacionalidade
// selecionada no formulário: aceita o valor se ele bater com o formato de QUALQUER
// nacionalidade suportada (alguém pode ter nacionalidade venezuelana com documento
// brasileiro e telefone uruguaio - nacionalidade da pessoa e origem do documento/
// telefone são coisas independentes na prática).
//
// Espelhado em public/assets/js/services/documentoValidatorService.js e
// public/admin/assets/js/services/documentoValidatorService.js (sem bundler nesse
// projeto - client e servidor não compartilham arquivo, só a mesma lógica).

function apenasDigitos(valor) {
	return (valor || '').toString().replace(/\D+/g, '');
}

function validarCPF(digits) {
	if (digits.length !== 11 || /^([0-9])\1+$/.test(digits)) return false;
	var sum = 0, rest, i;
	for (i = 1; i <= 9; i++) sum += parseInt(digits.substring(i - 1, i)) * (11 - i);
	rest = (sum * 10) % 11; if (rest === 10 || rest === 11) rest = 0;
	if (rest !== parseInt(digits.substring(9, 10))) return false;
	sum = 0;
	for (i = 1; i <= 10; i++) sum += parseInt(digits.substring(i - 1, i)) * (12 - i);
	rest = (sum * 10) % 11; if (rest === 10 || rest === 11) rest = 0;
	if (rest !== parseInt(digits.substring(10, 11))) return false;
	return true;
}

// Checksum da cédula de identidad uruguaia (7 dígitos + 1 dígito verificador).
// O DNIC não publica uma spec oficial - este é o algoritmo usado publicamente como
// referência (pesos [2,9,8,7,6,3,4] sobre os 7 primeiros dígitos). Vale testar com
// CIs reais se possível.
function validarCedulaUruguaia(digits) {
	if (digits.length < 7 || digits.length > 8) return false;
	while (digits.length < 8) digits = '0' + digits;
	var pesos = [2, 9, 8, 7, 6, 3, 4], soma = 0, i;
	for (i = 0; i < 7; i++) soma += (parseInt(digits.charAt(i), 10) * pesos[i]) % 10;
	var esperado = (soma % 10 === 0) ? 0 : (10 - (soma % 10));
	return esperado === parseInt(digits.charAt(7), 10);
}

// Cédula paraguaia/venezuelana: não existe checksum público conhecido pra essas -
// só checagem de faixa de dígitos plausível (documento numérico de 6 a 9 dígitos).
function validarDocumentoGenerico(digits) {
	return digits.length >= 6 && digits.length <= 9;
}

function validarDocumento(documento) {
	var digits = apenasDigitos(documento);
	if (validarCPF(digits)) return { valido: true, nacionalidadeDetectada: 'brasileiro' };
	if (validarCedulaUruguaia(digits)) return { valido: true, nacionalidadeDetectada: 'uruguaio' };
	if (validarDocumentoGenerico(digits)) return { valido: true, nacionalidadeDetectada: null };
	return { valido: false, mensagem: 'Documento de identificação inválido.' };
}

// Faixa de dígitos plausível por nacionalidade (sem DDI). Aceita se bater com
// QUALQUER uma - não tenta identificar de qual país é.
var FAIXAS_TELEFONE = [
	{ min: 10, max: 11 }, // brasileiro (DDD + fixo/celular)
	{ min: 8, max: 8 },   // uruguaio
	{ min: 9, max: 10 },  // paraguaio
	{ min: 10, max: 11 }  // venezuelano
];

// Quem copia o número de um contato/WhatsApp às vezes cola com o DDI (55) junto -
// o campo não pede DDI, só DDD, e isso só aparecia como erro confuso ("Telefone
// inválido.") bem no fim do formulário, sem dizer qual campo. Tolera o DDI: com
// DDI, um brasileiro fica com 12-13 dígitos (55 + DDD + número); tira o "55" antes
// de validar E de gravar, pra não salvar um telefone com DDI sobrando.
function normalizarTelefone(telefone) {
	var digits = apenasDigitos(telefone);
	if (digits.length > 11 && digits.indexOf('55') === 0) {
		digits = digits.substring(2);
	}
	return digits;
}

function validarTelefone(telefone) {
	var digits = normalizarTelefone(telefone);
	var valido = FAIXAS_TELEFONE.some(function (faixa) {
		return digits.length >= faixa.min && digits.length <= faixa.max;
	});
	return valido ? { valido: true, normalizado: digits } : { valido: false, mensagem: 'Telefone inválido.' };
}

module.exports = {
	validarCPF: function (documento) { return validarCPF(apenasDigitos(documento)); },
	validarCedulaUruguaia: function (documento) { return validarCedulaUruguaia(apenasDigitos(documento)); },
	validarDocumentoGenerico: function (documento) { return validarDocumentoGenerico(apenasDigitos(documento)); },
	validarDocumento: validarDocumento,
	validarTelefone: validarTelefone,
	normalizarTelefone: normalizarTelefone
};
