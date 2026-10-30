'use strict';

// Página HTML de fichas de avaliação pronta pra imprimir (uma ficha por folha). Usada pelas fichas
// em branco do menu Documentos (/fichas-avaliacao/:mostraId) e pelas fichas impressas por
// avaliador(a), o plano B da avaliação no evento sem internet (Avaliação > Banca: andamento).
//
// fichas: [{ titulo, linhas: [[rótulo, valor]], partes: [{ rotulo, criterios: [{nome, maximo}] }],
//            observacao, comAssinatura }]

const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (n) => String(n).replace('.', ',');

function ficha(f) {
	let total = 0;
	let partes = f.partes.map((p) => {
		let max = p.criterios.reduce((s, k) => s + k.maximo, 0);
		total += max;
		return '<tr class="parte"><td colspan="3">' + esc(p.rotulo) + ' <span>(' + num(max) + ' pontos)</span></td></tr>' +
			p.criterios.map((k) => '<tr><td>' + esc(k.nome) + '</td><td class="max">0 a ' + num(k.maximo) + '</td><td class="nota"></td></tr>').join('');
	}).join('');
	return '<section class="ficha">' +
		'<header><img src="/alpha/images/favicon.png" alt=""><div><h1>' + esc(f.titulo) + '</h1>' +
		(f.linhas || []).filter((l) => l[1]).map((l) => '<div><b>' + esc(l[0]) + ':</b> ' + esc(l[1]) + '</div>').join('') + '</div></header>' +
		(f.observacao ? '<p class="obs">' + esc(f.observacao) + '</p>' : '') +
		'<table><thead><tr><th>Critério</th><th class="max">Pontuação</th><th class="nota">Nota</th></tr></thead><tbody>' + partes +
		'<tr class="total"><td>Total</td><td class="max">' + num(total) + ' pontos</td><td class="nota"></td></tr></tbody></table>' +
		'<div class="campo">Comentários:</div><div class="linhas"></div>' +
		(f.comAssinatura ? '<div class="assinatura"><span>Data: ____/____/______</span><span>Assinatura do(a) avaliador(a): ______________________________</span></div>' : '') +
		'</section>';
}

module.exports.pagina = (titulo, intro, fichas) => '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">' +
	'<meta name="viewport" content="width=device-width, initial-scale=1"><title>' + esc(titulo) + '</title><style>' +
	'body{font-family:Roboto,Arial,sans-serif;color:#222;margin:0;background:#f4f4f4}' +
	'.barra{background:#43a047;color:#fff;padding:12px 20px;display:flex;align-items:center;gap:12px;flex-wrap:wrap}' +
	'.barra h2{margin:0;font-size:18px;flex:1}.barra button{background:#fff;color:#2e7d32;border:0;border-radius:4px;padding:8px 18px;font-size:15px;cursor:pointer}' +
	'.intro{max-width:800px;margin:16px auto 0;padding:0 16px;color:#555;font-size:14px}' +
	'.ficha{background:#fff;max-width:800px;margin:16px auto;padding:28px 32px;box-sizing:border-box}' +
	'header{display:flex;gap:16px;align-items:flex-start;border-bottom:2px solid #2e7d32;padding-bottom:10px;margin-bottom:12px}' +
	'header img{height:46px}header h1{font-size:19px;color:#225024;margin:0 0 6px}header div div{font-size:14px;margin:2px 0}' +
	'.obs{font-size:13px;color:#555;margin:6px 0 10px}' +
	'table{width:100%;border-collapse:collapse;font-size:14px}th,td{border:1px solid #999;padding:7px 8px;text-align:left}' +
	'th{background:#e8f5e9}.max{width:110px;text-align:center}.nota{width:90px}' +
	'.parte td{background:#f5f5f5;font-weight:bold;color:#225024}.parte span{font-weight:normal;color:#555}' +
	'.total td{font-weight:bold}.campo{margin-top:14px;font-size:14px;font-weight:bold}' +
	'.linhas{height:70px;background:repeating-linear-gradient(#fff,#fff 22px,#bbb 23px)}' +
	'.assinatura{display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-top:22px;font-size:13px}' +
	'@media print{body{background:#fff}.barra,.intro{display:none}.ficha{margin:0;padding:0;max-width:none;page-break-after:always}' +
	'.ficha:last-child{page-break-after:auto}th{background:#e8f5e9!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}}' +
	'</style></head><body><div class="barra"><h2>' + esc(titulo) + '</h2><button onclick="window.print()">Imprimir</button></div>' +
	(intro ? '<p class="intro">' + esc(intro) + '</p>' : '') +
	(fichas.length ? fichas.map(ficha).join('') : '<p class="intro">Nenhuma ficha para mostrar.</p>') +
	'</body></html>';
