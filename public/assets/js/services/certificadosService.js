(function(){
	'use strict';

	// Busca e emissão de certificados por documento - movido de homeCtrl.js (sem mudar a
	// lógica) pra ser usado também nos painéis de avaliador/participante: lá a pessoa já está
	// logada e vê TODOS os certificados do documento dela (todas as edições da MOVACI e todos
	// os papéis), no mesmo diálogo que gera os PDFs da página pública.
	angular
	.module('PDIAP')
	.factory('certificadosService', function($mdDialog, $window, projetosAPI, certificadoSeminarioService) {

		var SEM_LAYOUT = 'O certificado deste ano ainda não está disponível. Fale com a organização da MOVACI.';

		var countCertificados = 0;
		var avaliador = [];
		var participante = undefined;
		var orientador = [];
		var aluno = [];
		var semanaAcademica = [];
		var saberesDocentes = [];
		var oficina = [];
		var presenca_oficina = undefined;
		var palestra = [];
		var presenca_palestra = undefined;
		var premiados = [];
		var mencao_honrosa = [];
		var classificacoesFeira = [];
		var presenca_saberes = undefined;

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

		// let canvas = document.createElement("canvas");
		// let img = document.getElementById("preview");
		// canvas.width = img.width;
		// canvas.height = img.height;
		// let ctx = canvas.getContext("2d");
		// ctx.drawImage(img, 0, 0);
		// let aaa = canvas.toDataURL('image/jpeg',1.0);
				
		// let img2 = document.getElementById("preview2");
		// ctx.drawImage(img2, 0, 0);
		// let aaa2 = canvas.toDataURL('image/jpeg',1.0);

		// let background = aaa;

		// Separa a resposta de /emitirCertificado nas listas por tipo de certificado.
		let montarListas = function(data) {
				countCertificados = 0;
				avaliador = [];
				participante = undefined;
				orientador = [];
				aluno = [];
				semanaAcademica = [];
				saberesDocentes = [];
				oficina = [];
				presenca_oficina = undefined;
				palestra = [];
				presenca_palestra = undefined;
				premiados = [];
				mencao_honrosa = [];
				classificacoesFeira = [];
				presenca_saberes = undefined;
				
				if (data.length > 0) {
					let i = data.map(function(e) { return e.tipo; }).indexOf('Avaliador');
					if (i !== -1) {
						angular.forEach(data[i].avaliadores, function (value, key){
							countCertificados++;
							avaliador.push(value);
						});
					}
					i = data.map(function(e) { return e.tipo; }).indexOf('Participante');
					if (i !== -1) {
						let evts1 = '';
						let ch1 = '0:00';
						let evts3 = '';
						let ch3 = '0:00';
						let datas1 = [];
						let datas3 = [];
						angular.forEach(data[i].eventos, function (value, key){
							if (value.tipo === "Oficina") {
								if (evts1 === '') {
									evts1 = value.titulo;
								} else {
									evts1 = evts1+', '+value.titulo;
								}
								datas1.push(value.data || '');
								ch1 = somaHora(value.cargaHoraria,ch1);
							} else if (value.tipo === "Palestra") {
								// Datas juntas sem repetição e em ordem (juntaDatas) - evento de vários
								// dias traz "dd/mm/yyyy, dd/mm/yyyy" em value.data; vínculo antigo sem
								// data salva não entra.
								evts3 = evts3 === '' ? value.titulo : evts3+', '+value.titulo;
								datas3.push(value.data || '');
								ch3 = somaHora(value.cargaHoraria,ch3);
							}
						});
						if (evts1 !== '') {
							countCertificados++;
							presenca_oficina = {
								nome: data[i].nome,
								token: data[i].tokenOficinas,
								eventos: evts1,
								data: certificadoSeminarioService.juntaDatas(datas1),
								cargaHoraria: ch1,
								ano: data[i].ano
							};
						}
						let agregadoSeminario = certificadoSeminarioService.agregarEventos(data[i].eventos);
						if (agregadoSeminario.titulos.length) {
							countCertificados++;
							presenca_saberes = {
								nome: data[i].nome,
								token: data[i].tokenSaberes,
								cargaHoraria: agregadoSeminario.cargaHoraria,
								eventos: agregadoSeminario.textoVerso,
								data: agregadoSeminario.data,
								percentual: data[i].percentualSeminario,
								ano: data[i].ano
							};
						}
						if (evts3 !== '') {
							countCertificados++;
							presenca_palestra = {
								nome: data[i].nome,
								token: data[i].tokenPalestra,
								eventos: evts3,
								titulo: evts3,
								data: certificadoSeminarioService.juntaDatas(datas3),
								tipo: "Palestra",
								cargaHoraria: ch3,
								ano: data[i].ano
							};
						}
					}
					i = data.map(function(e) { return e.tipo; }).indexOf('ProjetoAluno');	
					if (i !== -1) {
						angular.forEach(data[i].integrantes, function (value, key){
							countCertificados++;
							aluno.push(value);
						});
					}
					i = data.map(function(e) { return e.tipo; }).indexOf('ProjetoOrientador');
					if (i !== -1) {
						angular.forEach(data[i].integrantes, function (value, key){
							countCertificados++;
							orientador.push(value);
						});
					}
					i = data.map(function(e) { return e.tipo; }).indexOf('Evento');
					if (i !== -1) {
						angular.forEach(data[i].evento, function (value, key){
							countCertificados++;
							if (value.tipo === "Semana Acadêmica") {
								semanaAcademica.push(value);
							} else if (value.tipo === "Seminário") {
								saberesDocentes.push(value);
							} else if (value.tipo === "Oficina") {
								oficina.push(value);
							} else if (value.tipo === "Palestra") {
								palestra.push(value);
							}
						});
					}
					i = data.map(function(e) { return e.tipo; }).indexOf('Premiado');
					if (i !== -1) {
						angular.forEach(data[i].projetos, function (value, key){
							countCertificados++;
							premiados.push(value);
						});
					}
					i = data.map(function(e) { return e.tipo; }).indexOf('Mencao_honrosa');
					if (i !== -1) {
						angular.forEach(data[i].projetos, function (value, key){
							countCertificados++;
							mencao_honrosa.push(value);
						});
					}
					i = data.map(function(e) { return e.tipo; }).indexOf('Feira');
					if (i !== -1) {
						angular.forEach(data[i].projetos, function (value, key){
							countCertificados++;
							classificacoesFeira.push(value);
						});
					}
				}
				return {
					countCertificados: countCertificados,
					avaliador: avaliador,
					participante: participante,
					orientador: orientador,
					aluno: aluno,
					semanaAcademica: semanaAcademica,
					saberesDocentes: saberesDocentes,
					oficina: oficina,
					presenca_oficina: presenca_oficina,
					premiados: premiados,
					mencao_honrosa: mencao_honrosa,
					classificacoesFeira: classificacoesFeira,
					presenca_saberes: presenca_saberes,
					palestra: palestra,
					presenca_palestra: presenca_palestra
				};
		};

		// Layouts dos certificados (um por ano, cadastrados no admin) e feiras filiadas (texto
		// do certificado de classificação).
		var carregarLayouts = function() {
			return projetosAPI.getMostra().then(function(mostraResponse) {
				return projetosAPI.getFeiras().then(function(feirasResponse) {
					return { dadosMostra: mostraResponse.data, dadosFeiras: feirasResponse.data };
				});
			});
		};

		// Mês/ano de HOJE por extenso, pro rodapé "Venâncio Aires, <mês> de <ano>." do certificado.
		var dataEmissao = function() {
			var date = new Date();
			var mes = date.getMonth();
			var ano = date.getFullYear();
			if (mes === 0) {
				var mesString = 'janeiro';
			} else if (mes === 1) {
				var mesString = 'fevereiro';
			} else if (mes === 2) {
				var mesString = 'março';
			} else if (mes === 3) {
				var mesString = 'abril';
			} else if (mes === 4) {
				var mesString = 'maio';
			} else if (mes === 5) {
				var mesString = 'junho';
			} else if (mes === 6) {
				var mesString = 'julho';
			} else if (mes === 7) {
				var mesString = 'agosto';
			} else if (mes === 8) {
				var mesString = 'setembro';
			} else if (mes === 9) {
				var mesString = 'outubro';
			} else if (mes === 10) {
				var mesString = 'novembro';
			} else if (mes === 11) {
				var mesString = 'dezembro';
			}
			return { mesString: mesString, ano: ano };
		};

		// Gera o PDF de um certificado. Fora do diálogo pra ser usado também na lista por
		// Mostra do "Meu painel" (listarCertificados). Retorna false quando não existe layout
		// cadastrado pro ano do certificado (Eventos > Cadastrar Certificado, no admin).
		var emitirCertificado1 = function(layouts, tipo, modo, dados) {
			var dadosMostra = layouts.dadosMostra;
			var dadosFeiras = layouts.dadosFeiras;
			var emissao = dataEmissao();
			var mesString = emissao.mesString;
			var ano = emissao.ano;
			// Ano do CERTIFICADO em si (não o ano atual, usado só na data de emissão no
			// rodapé) - dados.ano já vem pronto do backend pra todo tipo de certificado.
			// Antes vinha de "new Date(dados.createdAt).getFullYear()", mas presença de
			// oficina/palestra (participante genérico) nunca teve createdAt nesse objeto
			// - virava "Invalid Date" e o while() abaixo rodava pra sempre até estourar
			// o array (dadosMostra[i] undefined), travando a geração do PDF.
			var ano2 = dados.ano;
			var dados_certificado = {};
			var texto = "";

			//Itera pelos certificados pra encontrar o layout do ano certo - sem "achar",
			// dados_certificado fica {} (e o texto sai undefined, avisando que falta
			// cadastrar o certificado daquele ano em vez de travar a tela).
			for (var i = 0; i < dadosMostra.length; i++) {
				if (dadosMostra[i].ano_certificado == ano2) {
					dados_certificado = dadosMostra[i];
					break;
				}
			}
			
			if (tipo === 'Avaliador') {
				// var texto = ['Certificamos que ' +dados.nome.toUpperCase()+ ' participou como AVALIADOR (a) de '+
				// 'trabalhos apresentados na ', {text: '' +edicao+ ' MOVACI - Mostra Venâncio-airense de Cultura '+
				// 'e Inovação, do Instituto Federal de Educação, Ciência e Tecnologia Sul-rio-grandense, ',bold: true},
				// 'IFSul, Câmpus Venâncio Aires, ocorrida de ' +realizacao+'.\n\n'];
				texto = dados_certificado.textoAvaliador;
			} else if (tipo === 'Orientador') {
				// var texto = ['Certificamos que ' +dados.nome.toUpperCase()+ ' participou como ORIENTADOR (a) do '+
				// 'projeto ' +dados.nomeProjeto.toUpperCase()+ ' na ', {text: '' +edicao+ ' MOVACI - Mostra Venâncio-airense de Cultura '+
				// 'e Inovação, do Instituto Federal de Educação, Ciência e Tecnologia Sul-rio-grandense, ',bold: true},
				// 'IFSul, Câmpus Venâncio Aires, ocorrida de ' +realizacao+'.\n\n'];
				texto = dados_certificado.textoOrientador;
			} else if (tipo === 'Apresentacao') {
				// var texto = ['Certificamos que ' +dados.nome.toUpperCase()+ ' apresentou o projeto '+
				// dados.nomeProjeto.toUpperCase()+ ' na ', {text: '' +edicao+ ' MOVACI - Mostra Venâncio-airense de Cultura '+
				// 'e Inovação, do Instituto Federal de Educação, Ciência e Tecnologia Sul-rio-grandense, ',bold: true},
				// 'IFSul, Câmpus Venâncio Aires, ocorrida de ' +realizacao+ch+'\n\n'];
				texto = dados_certificado.textoApresentacao;
			} else if (tipo === 'Premiacao') {
				// var texto = ['Certificamos que o projeto ' +dados.nomeProjeto.toUpperCase()+ ' obteve destaque na categoria ' +dados.categoria.toUpperCase()+ ' e eixo ' +dados.eixo.toUpperCase()+
				// ', durante a ', {text: '' +edicao+ ' MOVACI - Mostra Venâncio-airense de Cultura e Inovação, do Instituto Federal de Educação, '+
				// 'Ciência e Tecnologia Sul-rio-grandense, ',bold: true}, 'IFSul, Câmpus Venâncio Aires, ocorrida de '+realizacao+'.\n\n'];
				texto = dados_certificado.textoPremiado;
			} else if (tipo === 'Mencao_honrosa') {
				// var texto = ['Certificamos que o projeto ' +dados.nomeProjeto.toUpperCase()+ ' obteve menção honrosa na categoria ' +dados.categoria.toUpperCase()+ ' e eixo ' +dados.eixo.toUpperCase()+
				// ', durante a ', {text: '' +edicao+ ' MOVACI - Mostra Venâncio-airense de Cultura e Inovação, do Instituto Federal de Educação, '+
				// 'Ciência e Tecnologia Sul-rio-grandense, ',bold: true}, 'IFSul, Câmpus Venâncio Aires, ocorrida de ' +realizacao+'.\n\n'];
				texto = dados_certificado.textoMencao;
			} else if (tipo === 'Feira') {
				// O layout/imagem do certificado continua vindo de dados_certificado (mostra do
				// ano), só o texto vem da feira em que o projeto foi classificado (ver feira-schema.js).
				var feiraEncontrada = dadosFeiras.filter(function(f) { return f._id === dados.feiraId; })[0];
				texto = feiraEncontrada ? feiraEncontrada.textoCertificado : '';
			} else if (tipo === 'Responsavel-saberes') {
				// var texto = ['Certificamos que ' +dados.responsavel.toUpperCase()+ ' atuou como conferencista, abordando tema '+
				// dados.titulo.toUpperCase()+ ' do Seminário Saberes Docentes, realizado na ', {text: '' +edicao+ ' MOVACI - Mostra Venâncio-airense de Cultura '+
				// 'e Inovação, do Instituto Federal de Educação, Ciência e Tecnologia Sul-rio-grandense, ',bold: true},
				// 'IFSul, Câmpus Venâncio Aires, ocorrida de ' +realizacao+'.\n\n'];
				texto = dados_certificado.textoSaberes;
			} else if (tipo === 'Presenca-oficinas') {
				// var texto = ['Certificamos que ' +dados.nome.toUpperCase()+ ' participou da (s) oficina (s) '+
				// dados.eventos.toUpperCase()+ ' com carga horária total de ' +dados.cargaHoraria+ ' hora (s), realizada (s) durante a ',
				// {text: '' +edicao+ ' MOVACI - Mostra Venâncio-airense de Cultura e Inovação, do Instituto Federal de Educação, Ciência e Tecnologia '+
				// 'Sul-rio-grandense, ',bold: true}, 'IFSul, Câmpus Venâncio Aires, ocorrida de ' +realizacao+'.\n\n'];
				texto = dados_certificado.textoPOficinas;
			} else if (tipo === 'Responsavel-oficinas') {
				// var texto = ['Certificamos que ' +dados.responsavel.toUpperCase()+ ' ofertou a oficina '+
				// dados.titulo.toUpperCase()+ ', com carga horária de ' +dados.cargaHoraria+ ' hora (s), durante a ',
				// {text: '' +edicao+ ' MOVACI - Mostra Venâncio-airense de Cultura e Inovação, do Instituto Federal de Educação, Ciência e Tecnologia '+
				// 'Sul-rio-grandense, ',bold: true}, 'IFSul, Câmpus Venâncio Aires, ocorrida de ' +realizacao+'.\n\n'];
				texto = dados_certificado.textoROficinas;
			} else if (tipo === 'Responsavel-semanaAcademica') {
				// var texto = ['Certificamos que ' +dados.responsavel.toUpperCase()+ ' atuou como conferencista, abordando tema '+
				// dados.titulo.toUpperCase()+ ', com carga horária de ' +dados.cargaHoraria+ ' hora (s), durante a semana acadêmica, realizada na ',
				// {text: '' +edicao+ ' MOVACI - Mostra Venâncio-airense de Cultura e Inovação, do Instituto Federal de Educação, Ciência e Tecnologia '+
				// 'Sul-rio-grandense, ',bold: true}, 'IFSul, Câmpus Venâncio Aires, ocorrida de ' +realizacao+'.\n\n'];
				texto = dados_certificado.textoAcademica;
			} else if (tipo === 'Presenca-palestra') {
				texto = dados_certificado.textoPPalestra;
			} else if (tipo === 'Responsavel-palestra') {
				texto = dados_certificado.textoRPalestra;
			}

			//usa regex pra alterar as chaves no texto pela informação correspondente Ex: ¨nome -> Mateus R. Algayer,
			//¨nomeProjeto -> PDIAPIA, e assim por diante. Um replace só, com regex global
			// (/g) - antes, quando a chave usada no texto não existia em "dados" (ex:
			// alguém usa ¨eventos num texto de responsável, que só tem ¨titulo), a
			// função de troca não retornava nada e a ocorrência virava a palavra
			// "undefined" no certificado gerado. Agora, sem chave correspondente, o
			// ¨placeholder simplesmente fica como está no texto - visivelmente errado,
			// mas não confundível com um dado de verdade.
			// Sem layout/texto cadastrado pro ano desse certificado: não há o que gerar (antes
			// estourava um TypeError no replace abaixo e o clique simplesmente não fazia nada).
			if (!texto) return false;

			texto = texto.replace(/¨(\w+)/g, function(str, chave) {
				return dados.hasOwnProperty(chave) ? String(dados[chave]).toUpperCase() : str;
			});

			// var url_1 = window.localStorage.getItem('url1');
			// var url_2 = window.sessionStorage.getItem('url2');
			// var urlmemo = url_1+url_2;
			

			var docDefinition = {
				pageSize: 'A4',
				pageOrientation: 'landscape',
				background: [
					{
						image: dados_certificado.imagem,
						width: 841,
						alignment: 'center'
					}
				],
				content: [
					{
						text: texto + "\n\n\n\n",
						alignment: 'justify',
						margin: [50,210,50,0],
						fontSize: 16
					},
					{
						text: 'Venâncio Aires, ' +mesString+ ' de '  +ano+ '.',
						alignment: 'center',
						fontSize: 14
					}
				],
				footer: [
					{
						text: 'Número de validação: ' +dados.token+ '. As informações deste certificado podem ser validadas em www.movaci.com.br/certificados.',
						alignment: 'center',
						fontSize: 11,
						// margin: [0,20],
						// color: '#757575'
					}
				]
			};
			if (modo === 1) {
				//pdfMake.createPdf(docDefinition).open();
			} else if (modo === 2) {
				pdfMake.createPdf(docDefinition).download('Certificado_'+tipo+'_MOVACI_'+ano2+'.pdf');
			}
			return true;
		};

		// Certificado de participação no Seminário (2 páginas: texto + verso com os eventos).
		var emitirCertificado2 = function(layouts, modo, dados) {
			var dadosMostra = layouts.dadosMostra;
			var emissao = dataEmissao();
			var mesString = emissao.mesString;
			var ano = emissao.ano;
			var dados_certificado = {};
			var texto = "";
			// var texto = ['Certificamos que ' +dados.nome.toUpperCase()+ ' participou do IV Seminário Saberes Docentes, com '+
			// 'carga horária de ' +dados.cargaHoraria+ ' hora (s), nos dias 26 e 27 de setembro de 2016, que integrou a programação da ',
			// {text: 'V MOVACI - Mostra Venâncio-airense de Cultura e Inovação, do Instituto Federal de Educação, Ciência e '+
			// 'Tecnologia Sul-rio-grandense, ',bold: true}, 'IFSul, Câmpus Venâncio Aires, ocorrida de 28 a 30 de setembro de 2016.\n\n'];

			//Itera pelos certificados para encontrar o layout necessário
			for (var i = 0; i < dadosMostra.length; i++) {
				if (dadosMostra[i].ano_certificado == dados.ano) {
					dados_certificado = dadosMostra[i];
					break;
				}
			}
			//pega o texto que vai ser utilizado no certificado
			texto = dados_certificado.textoDocentes;
			// var url_1 = window.localStorage.getItem('url1');
			// var url_2 = window.sessionStorage.getItem('url2');

			//usa regex pra alterar as chaves no texto pela informação correspondente Ex: ¨nome -> Mateus R. Algayer,
			//¨nomeProjeto -> PDIAPIA, e assim por diante (ver comentário equivalente em
			// emitirCertificado1 - ¨chave sem correspondência em "dados" fica como está,
			// em vez de virar "undefined").
			if (!texto) return false;

			texto = texto.replace(/¨(\w+)/g, function(str, chave) {
				return dados.hasOwnProperty(chave) ? String(dados[chave]).toUpperCase() : str;
			});

			var docDefinition = {
				pageSize: 'A4',
				pageOrientation: 'landscape',
				background: function(currentPage) {
					if (currentPage === 1) {
						var img_url = dados_certificado.imagem;
					} else if (currentPage === 2) {
						var img_url = dados_certificado.imagemFundo;
					}
					return [
						{
							image: img_url,
							width: 841,
							alignment: 'center'
						}
					]
				},
				content: [
					{
						text: texto + "\n\n\n\n",
						alignment: 'justify',
						margin: [50,210,50,0],
						fontSize: 16
					},
					{
						text: 'Venâncio Aires, ' +mesString+ ' de '  +ano+ '.',
						alignment: 'center',
						fontSize: 14,
						pageBreak: 'after'
					},
					{
						text: 'EVENTOS:\n\n\n'+dados.eventos,
						fontSize: 14,
						margin: [0,60,0,0]
					}
				],
				footer: function(currentPage) {
					if (currentPage === 1) {
						return [
							{
								text: 'Número de validação: ' +dados.token+ '. As informações deste certificado podem ser validadas em www.movaci.com.br/certificados.',
								alignment: 'center',
								fontSize: 11
								// margin: [0,20],
								// color: '#757575'
							}
						]
					}
				}
			};
			if (modo === 1) {
				pdfMake.createPdf(docDefinition).open();
			} else if (modo === 2) {
				pdfMake.createPdf(docDefinition).download('Certificado_SaberesDocentes_MOVACI_2016.pdf');
			}
			return true;
		};

		let buscarCPF = function(cpf) {
			projetosAPI.postCertificado(cpf)
			.then(function(response) {
				var data = response.data;
				if (data.length > 0) {
					var listas = montarListas(data);
					//Antes de passar para a criação do certificado puxa os dados das mostras e das feiras cadastradas
					carregarLayouts().then(function(layouts) {
						visualizarCertificados(layouts, listas);
					}, function(response) {
						console.log('Error: ' + response.data);
					});
				} else {
					let showAlert = function(ev) {
						$mdDialog.show(
							$mdDialog.alert()
							.parent(angular.element(document.querySelector('#popupContainer') || document.body))
							.clickOutsideToClose(false)
							.textContent('O documento ' +cpf+ ' não possui certificado.')
							.ok('OK')
							.targetEvent(ev)
						);
					};
					showAlert();
				}
			}, function(response) {
				let showConfirmDialog = function(ev) {
					var confirm = $mdDialog.confirm()
					.title('Oxe...')
					.textContent('Houve algum erro ao enviar o email. Tente mais tarde ou então, entre em contato conosco.')
					.targetEvent(ev)
					.theme('error')
					.ok('Continuar')
					.cancel('Entrar em contato');
					$mdDialog.show(confirm).then(function() {}
					, function() {
						$window.location.href="/contato";
					});
				};
				showConfirmDialog();
			});
		};

		let visualizarCertificados = function(layouts, listas, ev) {
			$mdDialog.show({
				controller: function dialogCertificateController($scope, $window, $mdDialog) {
					$scope.avaliador = listas.avaliador;
					$scope.participante = listas.participante;
					$scope.orientador = listas.orientador;
					$scope.aluno = listas.aluno;
					$scope.semanaAcademica = listas.semanaAcademica;
					$scope.saberesDocentes = listas.saberesDocentes;
					$scope.oficina = listas.oficina;
					$scope.presenca_oficina = listas.presenca_oficina;
					$scope.premiados = listas.premiados;
					$scope.mencao_honrosa = listas.mencao_honrosa;
					$scope.classificacoesFeira = listas.classificacoesFeira;
					$scope.presenca_saberes = listas.presenca_saberes;
					$scope.palestra = listas.palestra;
					$scope.presenca_palestra = listas.presenca_palestra;
					$scope.countCertificados = listas.countCertificados;

					$scope.emitirCertificado1 = function(tipo, modo, dados) {
						if (!emitirCertificado1(layouts, tipo, modo, dados)) $window.alert(SEM_LAYOUT);
					};
					$scope.emitirCertificado2 = function(modo, dados) {
						if (!emitirCertificado2(layouts, modo, dados)) $window.alert(SEM_LAYOUT);
					};
					$scope.hide = function() {
						$mdDialog.hide();
					};
					$scope.cancel = function() {
						$mdDialog.cancel();
					};
				},
				templateUrl: '/views/details.certificado.html',
				parent: angular.element(document.body),
				targetEvent: ev,
				clickOutsideToClose: false,
				fullscreen: true // Only for -xs, -sm breakpoints.
			});
		};

		// Lista "achatada" de todos os certificados do documento, cada um com rótulo, ano e uma
		// função baixar() - usada no "Meu painel" pra mostrar os certificados dentro de cada
		// Mostra (filtrando por ano). Mesmos rótulos do diálogo (views/details.certificado.html).
		// baixar() retorna false quando não há layout cadastrado pro ano do certificado.
		var listarCertificados = function(documento) {
			return projetosAPI.postCertificado(documento).then(function(response) {
				var listas = montarListas(response.data || []);
				return carregarLayouts().then(function(layouts) {
					var itens = [];
					var add = function(dados, rotulo, tipo, detalhe) {
						if (!dados) return;
						itens.push({
							rotulo: rotulo, detalhe: detalhe, ano: dados.ano,
							baixar: function() {
								return tipo === 'Presenca-saberes' ? emitirCertificado2(layouts, 2, dados) : emitirCertificado1(layouts, tipo, 2, dados);
							}
						});
					};
					angular.forEach(listas.avaliador, function(d) { add(d, 'Avaliação', 'Avaliador'); });
					angular.forEach(listas.orientador, function(d) { add(d, 'Orientação de projeto', 'Orientador', d.nomeProjeto); });
					angular.forEach(listas.aluno, function(d) { add(d, 'Apresentação de projeto', 'Apresentacao', d.nomeProjeto); });
					angular.forEach(listas.premiados, function(d) { add(d, 'Premiação de projeto', 'Premiacao', d.nomeProjeto); });
					angular.forEach(listas.mencao_honrosa, function(d) { add(d, 'Menção Honrosa', 'Mencao_honrosa', d.nomeProjeto); });
					angular.forEach(listas.classificacoesFeira, function(d) { add(d, 'Classificado(a) para ' + d.feiraNome, 'Feira', d.nomeProjeto); });
					angular.forEach(listas.saberesDocentes, function(d) { add(d, 'Seminário Saberes Docentes (responsável)', 'Responsavel-saberes', d.titulo); });
					angular.forEach(listas.oficina, function(d) { add(d, 'Oficineiro(a)', 'Responsavel-oficinas', d.titulo); });
					angular.forEach(listas.palestra, function(d) { add(d, 'Palestrante', 'Responsavel-palestra', d.titulo); });
					angular.forEach(listas.semanaAcademica, function(d) { add(d, 'Semana Acadêmica', 'Responsavel-semanaAcademica', d.titulo); });
					add(listas.presenca_oficina, 'Participação em oficina(s)', 'Presenca-oficinas', listas.presenca_oficina && listas.presenca_oficina.eventos);
					add(listas.presenca_palestra, 'Participação em palestra(s)', 'Presenca-palestra', listas.presenca_palestra && listas.presenca_palestra.eventos);
					add(listas.presenca_saberes, 'Participação em Sem. Saberes Docentes', 'Presenca-saberes');
					return itens;
				});
			});
		};

		return {
			buscarPorDocumento: buscarCPF,
			listarCertificados: listarCertificados
		};
	});
})();
