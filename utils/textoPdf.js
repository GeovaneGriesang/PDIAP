'use strict';

// Texto aproximado de um PDF, sem dependência externa: descompacta os streams (FlateDecode) e junta o
// que estiver nos operadores de texto (Tj/TJ). Não serve pra exibir - só pra conferir se um nome
// aparece no arquivo (ver scripts/migrar-relatorios.js). PDF com fonte em códigos de glifo (CID)
// volta vazio/ilegível; o metadado /Author e /Title também entra.

const zlib = require('zlib');

function decodificarLiteral(s) {
	return s.replace(/\\([nrtbf()\\]|[0-7]{1,3})/g, (m, c) => {
		if (/^[0-7]+$/.test(c)) return String.fromCharCode(parseInt(c, 8));
		return { n: '\n', r: '\r', t: '\t', b: '', f: '', '(': '(', ')': ')', '\\': '\\' }[c];
	});
}

function textoDosOperadores(conteudo) {
	let partes = [];
	let re = /\((?:\\.|[^\\)])*\)|<[0-9a-fA-F\s]+>/g;
	// Só dentro de blocos BT ... ET (texto).
	let blocos = conteudo.match(/BT[\s\S]*?ET/g) || [];
	for (let b of blocos) {
		let m;
		while ((m = re.exec(b))) {
			let t = m[0];
			if (t[0] === '(') partes.push(decodificarLiteral(t.slice(1, -1)));
			else {
				let hex = t.slice(1, -1).replace(/\s/g, '');
				// 4 dígitos = UTF-16; 2 = byte
				if (hex.length % 4 === 0 && /^(00[0-9a-fA-F]{2})+$/.test(hex)) partes.push(hex.match(/.{4}/g).map((h) => String.fromCharCode(parseInt(h, 16))).join(''));
				else partes.push(hex.match(/.{1,2}/g).map((h) => String.fromCharCode(parseInt(h, 16))).join(''));
			}
		}
		partes.push(' ');
	}
	return partes.join('');
}

module.exports = (buffer) => {
	let bruto = buffer.toString('latin1');
	let textos = [];
	(bruto.match(/\/(Author|Title|Subject)\s*\((?:\\.|[^\\)])*\)/g) || []).forEach((x) => textos.push(decodificarLiteral(x.replace(/^\/\w+\s*\(/, '').slice(0, -1))));
	let re = /stream\r?\n/g, m;
	while ((m = re.exec(bruto))) {
		let inicio = m.index + m[0].length;
		let fim = bruto.indexOf('endstream', inicio);
		if (fim < 0) break;
		let dados = buffer.subarray(inicio, fim);
		let conteudo;
		try { conteudo = zlib.inflateSync(dados).toString('latin1'); } catch (e) {
			try { conteudo = zlib.inflateSync(dados, { finishFlush: zlib.constants.Z_SYNC_FLUSH }).toString('latin1'); } catch (e2) { conteudo = null; }
		}
		if (conteudo && /BT[\s\S]*?ET/.test(conteudo)) textos.push(textoDosOperadores(conteudo));
		re.lastIndex = fim;
		if (textos.join(' ').length > 200000) break;
	}
	return textos.join(' ');
};

// Palavras "fortes" (4+ letras, sem acento, minúsculas) de um texto.
module.exports.palavras = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
	.split(/[^a-z0-9]+/).filter((w) => w.length >= 4);
