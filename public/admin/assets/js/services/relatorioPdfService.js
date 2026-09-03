(function(){
	'use strict';

	// Gera PDFs de relatório com cabeçalho (logo + título) e rodapé (linha + "página N
	// de M") padronizados - mesmo visual em todo PDF do admin, pra não repetir esse
	// bloco em cada controller. Usa pdfMake (já carregado globalmente, ver
	// views/layout_admin2.ejs) - client-side, não depende de nada no servidor.
	angular
	.module('PDIAPa')
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
			// logo.png é a versão de 2016 (o ano vem desenhado dentro da própria imagem);
			// logo3.png é só a marca "MOVACI", sem ano - a mesma já usada no cabeçalho do
			// site público (views/layout2.ejs).
			img.src = '/assets/images/logo3.png';
			logoDataUri = deferred.promise;
			return logoDataUri;
		}

		// Monta e abre o PDF. `opcoes`:
		//   titulo (obrigatório), subtitulo, orientacao ('portrait'|'landscape', default
		//   'portrait'), conteudo (array de nós pdfMake - o corpo do relatório em si,
		//   normalmente um título+tabela por seção, já formatado por quem chama).
		function gerar(opcoes) {
			// A aba precisa abrir NESTE exato instante, ainda síncrono com o clique que
			// chamou essa função - é o motivo do comentário no próprio código-fonte do
			// pdfMake ("we have to open the window immediately... otherwise popup
			// blockers will stop us"). Carregar a logo é assíncrono (busca a imagem,
			// converte num <canvas>); esperar isso terminar pra só DEPOIS chamar
			// pdfMake...open() - como este código fazia antes - abre a aba tarde demais:
			// o navegador não reconhece mais como resposta direta ao clique e ou bloqueia
			// a aba, ou ela abre em branco e nunca é preenchida ("about:blank"). Abrindo
			// aqui e preenchendo o location.href só depois que o PDF fica pronto (mesma
			// técnica que o pdfMake usa internamente, só que na hora certa) resolve.
			var janela = window.open('', '_blank');
			return $q.when(carregarLogo()).then(function(logo) {
				// "fit" (não "width" sozinho): o arquivo original tem uma faixa de espaço
				// vazio em volta do texto, então escalar só pela LARGURA mantendo a
				// proporção do arquivo deixava a imagem mais alta do que parece visualmente
				// - suficiente pra sobrepor o título ao lado. "fit" encaixa dentro da caixa
				// (como object-fit:contain em CSS) sem distorcer nem sobrepor.
				var cabecalhoLogo = logo
					? [{ image: logo, fit: [100, 32], margin: [40, 20, 0, 0] }]
					: [{ text: 'MOVACI', bold: true, fontSize: 14, color: '#225024', margin: [40, 24, 0, 0] }];

				var docDefinition = {
					pageSize: 'A4',
					pageOrientation: opcoes.orientacao || 'portrait',
					pageMargins: [40, 90, 40, 50],
					header: function(paginaAtual) {
						if (paginaAtual > 1) {
							// Só a primeira página carrega o cabeçalho cheio (logo + título) -
							// nas seguintes um cabeçalho fino evita repetir o mesmo bloco grande
							// em relatórios de muitas páginas.
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
					defaultStyle: opcoes.estiloPadrao || { fontSize: 9 }
				};
				try {
					// getBuffer + Blob (não getDataUrl): Chrome bloqueia silenciosamente a
					// navegação de uma aba pra uma URL "data:" (restrição de segurança contra
					// phishing) - "janela.location.href = dataUrl" não dava erro nenhum, só
					// deixava a aba em about:blank pra sempre. "blob:" não tem essa restrição.
					pdfMake.createPdf(docDefinition).getBuffer(function(buffer) {
						if (!janela) return;
						var blob = new Blob([buffer], { type: 'application/pdf' });
						janela.location.href = URL.createObjectURL(blob);
					});
				} catch (e) {
					if (janela) janela.close();
					throw e;
				}
			});
		}

		// Atalho pro caso mais comum: um título + uma tabela só (a maioria das seções
		// de relatório é exatamente isso). `colunas` é [{texto, largura}], `linhas` é
		// array de arrays já na ordem das colunas.
		function tabela(opcoes) {
			var corpo = [opcoes.colunas.map(function(c) {
				return { text: c.texto, style: 'tableHeader' };
			})];
			opcoes.linhas.forEach(function(linha) { corpo.push(linha); });

			return gerar({
				titulo: opcoes.titulo,
				subtitulo: opcoes.subtitulo,
				orientacao: opcoes.orientacao,
				conteudo: [{
					table: {
						headerRows: 1,
						widths: opcoes.colunas.map(function(c) { return c.largura || '*'; }),
						body: corpo
					},
					layout: 'lightHorizontalLines'
				}],
				estilos: { tableHeader: { bold: true, fontSize: 9, fillColor: '#eeeeee' } }
			});
		}

		return { gerar: gerar, tabela: tabela };
	});
})();
