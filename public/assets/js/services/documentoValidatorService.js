(function(){
	'use strict';

	// Validação de documento de identificação e telefone SEM depender da nacionalidade
	// selecionada no formulário: aceita o valor se ele bater com o formato de QUALQUER
	// nacionalidade suportada. Mesma lógica de utils/documentoValidator.js (servidor) -
	// este projeto não tem bundler, então client e servidor não compartilham arquivo.

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

	// Checksum da cédula de identidad uruguaia - ver utils/documentoValidator.js pra
	// mais detalhes sobre a origem do algoritmo.
	function validarCedulaUruguaia(digits) {
		if (digits.length < 7 || digits.length > 8) return false;
		while (digits.length < 8) digits = '0' + digits;
		var pesos = [2, 9, 8, 7, 6, 3, 4], soma = 0, i;
		for (i = 0; i < 7; i++) soma += (parseInt(digits.charAt(i), 10) * pesos[i]) % 10;
		var esperado = (soma % 10 === 0) ? 0 : (10 - (soma % 10));
		return esperado === parseInt(digits.charAt(7), 10);
	}

	// Cédula paraguaia/venezuelana: sem checksum público conhecido - só faixa de dígitos.
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

	// Documento de pessoa de QUALQUER país (pode ter letras, ex: passaporte) - mesma regra de
	// utils/documentoValidator.js#validarDocumentoQualquerPais (servidor): 5 a 20 letras/números
	// depois de tirar pontuação; só CPF (11 dígitos) tem o dígito verificador conferido.
	function normalizarDocumento(documento) {
		return (documento || '').toString().replace(/[^0-9A-Za-z]/g, '').toUpperCase();
	}

	function validarDocumentoQualquerPais(documento) {
		var doc = normalizarDocumento(documento);
		if (!/^[0-9A-Z]{5,20}$/.test(doc)) return { valido: false, mensagem: 'Documento de identificação inválido.' };
		if (/^[0-9]{11}$/.test(doc) && !validarCPF(doc)) return { valido: false, mensagem: 'CPF inválido.' };
		return { valido: true, normalizado: doc };
	}

	var FAIXAS_TELEFONE = [
		{ min: 10, max: 11 }, // brasileiro
		{ min: 8, max: 8 },   // uruguaio
		{ min: 9, max: 10 },  // paraguaio
		{ min: 10, max: 11 }, // venezuelano
		// Qualquer outro país: número completo COM código do país (DDI), até 15 dígitos
		// (limite do padrão internacional E.164) - ex: Argentina +54 9 11 xxxx-xxxx.
		{ min: 12, max: 15 }
	];

	// Tolera um DDI "55" colado antes do DDD (comum ao copiar de um contato/WhatsApp) -
	// ver utils/documentoValidator.js (servidor) pra mais detalhes.
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

	angular
	.module('PDIAP')
	.factory('documentoValidatorService', function() {
		return {
			validarCPF: function (documento) { return validarCPF(apenasDigitos(documento)); },
			validarCedulaUruguaia: function (documento) { return validarCedulaUruguaia(apenasDigitos(documento)); },
			validarDocumentoGenerico: function (documento) { return validarDocumentoGenerico(apenasDigitos(documento)); },
			validarDocumento: validarDocumento,
			normalizarDocumento: normalizarDocumento,
			validarDocumentoQualquerPais: validarDocumentoQualquerPais,
			validarTelefone: validarTelefone,
			normalizarTelefone: normalizarTelefone
		};
	});

})();
