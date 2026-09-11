(function(){
	'use strict';

	// Mesmo serviço de public/admin/assets/js/services/relatorioPdfService.js (módulo
	// PDIAPa), duplicado aqui pro módulo PDIAPav - esse app de avaliação (public/admin/avaliacao/)
	// é um bootstrap Angular separado do admin (mesmo padrão já usado por
	// avaliacaoAPIService.js vs adminAPIService.js), então não dá pra reaproveitar a
	// factory de lá direto: "angular.module('PDIAPa')" não existe aqui.
	angular
	.module('PDIAPav')
	.factory('relatorioPdfService', function($q) {

		// pdfMake só aceita imagem como data URI, não URL - busca uma vez só e reaproveita
		// (a promise em cache serve pra toda chamada seguinte na mesma sessão de página).
		//
		// O logo original é PNG com canal alfa (RGBA) - o decodificador de imagem
		// embutido no pdfMake trava justamente nesse caso ("offset is out of bounds",
		// PDF nunca termina de gerar). Achata pra JPEG num <canvas> com fundo branco
		// antes de entregar pro pdfMake - visualmente idêntico numa página branca, mas
		// sem canal alfa, o que já era o suficiente pra fazer o pdfMake funcionar.
		var logoDataUri = null;
		function carregarLogo() {
			if (logoDataUri) return logoDataUri;
			var deferred = $q.defer();
			var img = new Image();
			img.onload = function() {
				try {
					var canvas = document.createElement('canvas');
					canvas.width = img.naturalWidth;
					canvas.height = img.naturalHeight;
					var ctx = canvas.getContext('2d');
					ctx.fillStyle = '#ffffff';
					ctx.fillRect(0, 0, canvas.width, canvas.height);
					ctx.drawImage(img, 0, 0);
					deferred.resolve(canvas.toDataURL('image/jpeg', 0.92));
				} catch (e) {
					deferred.resolve(null);
				}
			};
			img.onerror = function() { deferred.resolve(null); };
			img.src = '/assets/images/logo3.png';
			logoDataUri = deferred.promise;
			return logoDataUri;
		}

		// Monta e baixa o PDF. `opcoes`:
		//   titulo (obrigatório), subtitulo, orientacao ('portrait'|'landscape', default
		//   'portrait'), conteudo (array de nós pdfMake - o corpo do relatório em si,
		//   normalmente um título+tabela por seção, já formatado por quem chama),
		//   arquivo (nome do arquivo baixado, sem ".pdf").
		function gerar(opcoes) {
			return $q.when(carregarLogo()).then(function(logo) {
				var cabecalhoLogo = logo
					? [{ image: logo, fit: [100, 32], margin: [40, 20, 0, 0] }]
					: [{ text: 'MOVACI', bold: true, fontSize: 14, color: '#225024', margin: [40, 24, 0, 0] }];

				var docDefinition = {
					pageSize: 'A4',
					pageOrientation: opcoes.orientacao || 'portrait',
					pageMargins: [40, 90, 40, 50],
					header: function(paginaAtual) {
						if (paginaAtual > 1) {
							return { text: opcoes.titulo, fontSize: 9, color: '#888888', margin: [40, 20, 40, 0] };
						}
						return {
							stack: [
								{
									columns: cabecalhoLogo.concat([{
										stack: [
											{ text: opcoes.titulo, fontSize: 15, bold: true, color: '#225024' },
											opcoes.subtitulo ? { text: opcoes.subtitulo, fontSize: 9, color: '#666666', margin: [0, 2, 0, 0] } : {}
										],
										margin: [12, 26, 40, 0]
									}])
								},
								{ canvas: [{ type: 'line', x1: 40, y1: 18, x2: 555, y2: 18, lineWidth: 1, lineColor: '#cccccc' }] }
							]
						};
					},
					footer: function(paginaAtual, totalPaginas) {
						return {
							columns: [
								{ text: 'MOVACI - Mostra Venâncio-airense de Cultura e Inovação', fontSize: 7, color: '#999999', margin: [40, 0, 0, 0] },
								{ text: 'p. ' + paginaAtual + ' de ' + totalPaginas, fontSize: 7, color: '#999999', alignment: 'right', margin: [0, 0, 40, 0] }
							]
						};
					},
					content: opcoes.conteudo,
					styles: opcoes.estilos,
					defaultStyle: opcoes.estiloPadrao || { fontSize: 9 },
					info: opcoes.arquivo ? { title: opcoes.arquivo } : undefined
				};
				pdfMake.createPdf(docDefinition).getBuffer(function(buffer) {
					var blob = new Blob([buffer], { type: 'application/pdf' });
					var url = URL.createObjectURL(blob);
					var link = document.createElement('a');
					link.href = url;
					link.download = (opcoes.arquivo || 'relatorio') + '.pdf';
					document.body.appendChild(link);
					link.click();
					document.body.removeChild(link);
					setTimeout(function() { URL.revokeObjectURL(url); }, 30000);
				});
			});
		}

		// Nó de tabela do pdfMake a partir de {colunas, linhas} - usado tanto por
		// tabela() (uma seção) quanto por tabelas() (várias seções num PDF só).
		function noTabela(colunas, linhas) {
			var corpo = [colunas.map(function(c) {
				return { text: c.texto, style: 'tableHeader' };
			})];
			linhas.forEach(function(linha) {
				corpo.push(linha.map(function(celula) {
					return celula === null || celula === undefined ? '' : String(celula);
				}));
			});
			return {
				table: {
					headerRows: 1,
					widths: colunas.map(function(c) { return c.largura || '*'; }),
					body: corpo
				},
				layout: 'lightHorizontalLines'
			};
		}

		var ESTILOS_TABELA = { tableHeader: { bold: true, fontSize: 9, fillColor: '#eeeeee' } };

		function tabela(opcoes) {
			return gerar({
				titulo: opcoes.titulo,
				subtitulo: opcoes.subtitulo,
				orientacao: opcoes.orientacao,
				arquivo: opcoes.arquivo,
				conteudo: [noTabela(opcoes.colunas, opcoes.linhas)],
				estilos: ESTILOS_TABELA
			});
		}

		// Várias seções num PDF só. `opcoes.secoes` é [{titulo, colunas, linhas}] - cada
		// uma vira um subtítulo + tabela, na ordem.
		function tabelas(opcoes) {
			var conteudo = [];
			opcoes.secoes.forEach(function(sec, i) {
				conteudo.push({ text: sec.titulo, style: 'secaoTitulo', margin: [0, i === 0 ? 0 : 18, 0, 6] });
				conteudo.push(noTabela(sec.colunas, sec.linhas));
			});
			return gerar({
				titulo: opcoes.titulo,
				subtitulo: opcoes.subtitulo,
				orientacao: opcoes.orientacao,
				arquivo: opcoes.arquivo,
				conteudo: conteudo,
				estilos: angular.extend({ secaoTitulo: { bold: true, fontSize: 12, color: '#225024' } }, ESTILOS_TABELA)
			});
		}

		return { gerar: gerar, tabela: tabela, tabelas: tabelas };
	});
})();
