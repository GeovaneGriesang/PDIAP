(function(){
	'use strict';

	angular
	.module('PDIAP')
	.controller('homeCtrl', function($scope, $rootScope, $location, $mdDialog, projetosAPI) {
		
		projetosAPI.getDocumentos().success(function(documentos){
			$scope.documentos = documentos;

			$scope.ExibeDocumentos = documentos.length > 0;
		}
			
		)

		$scope.edits = [];

		$scope.carregarEdits = function(){
			projetosAPI.getEdits().success(function(edits){
				$scope.edits = edits;				
			})
			.error(function(status) {
				console.log(status);
			});
		}
		$scope.carregarEdits();

		var countCertificados = 0;
		var avaliador = [];
		var participante = undefined;
		var orientador = [];
		var aluno = [];
		var semanaAcademica = [];
		var saberesDocentes = [];
		var oficina = [];
		var presenca_oficina = undefined;
		var premiados = [];
		var mencao_honrosa = [];
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

		$scope.showLoginDialog = function(ev) {
			$mdDialog.show({
				// controller: () => this,
				templateUrl: '/views/login.html',
				parent: angular.element(document.body),
				targetEvent: ev,
				clickOutsideToClose: true
			});
		};

		let buscarCPF = function(cpf) {
			projetosAPI.postCertificado(cpf)
			.success(function(data) {
				countCertificados = 0;
				avaliador = [];
				participante = undefined;
				orientador = [];
				aluno = [];
				semanaAcademica = [];
				saberesDocentes = [];
				oficina = [];
				presenca_oficina = undefined;
				premiados = [];
				mencao_honrosa = [];
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
						// let evts2 = '';
						let ch2 = '0:00';
						let eventos = '';
						angular.forEach(data[i].eventos, function (value, key){
							if (value.tipo === "Oficina") {
								if (evts1 === '') {
									evts1 = value.titulo;
								} else {
									evts1 = evts1+', '+value.titulo;
								}
								ch1 = somaHora(value.cargaHoraria,ch1);
							} else if (value.tipo === "Seminário Saberes Docentes") {
								if (eventos === '') {
									// evts2 = value.titulo;
									eventos = value.titulo+': '+value.cargaHoraria+' hora (s).\n';
								} else {
									// evts2 = evts2+', '+value.titulo;
									eventos = eventos + value.titulo+': '+value.cargaHoraria+' hora (s).\n';
								}
								ch2 = somaHora(value.cargaHoraria,ch2);
							}
						});
						if (evts1 !== '') {
							countCertificados++;
							presenca_oficina = {
								nome: data[i].nome,
								token: data[i].tokenOficinas,
								eventos: evts1,
								cargaHoraria: ch1,
								ano: data[i].ano
							};
						}
						if (eventos !== '') {
							countCertificados++;
							presenca_saberes = {
								nome: data[i].nome,
								token: data[i].tokenSaberes,
								cargaHoraria: ch2,
								eventos: eventos,
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
							} else if (value.tipo === "Seminário Saberes Docentes") {
								saberesDocentes.push(value);
							} else if (value.tipo === "Oficina") {
								oficina.push(value);
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
					//Antes de passar para a criação do certificado puxa os dados das mostras 
					projetosAPI.getMostra()
					.success(function(dadosMostra){
						visualizarCertificados(dadosMostra,avaliador,participante,orientador,aluno,semanaAcademica,saberesDocentes,oficina,presenca_oficina,premiados,mencao_honrosa,presenca_saberes,countCertificados);
					});
				} else {
					let showAlert = function(ev) {
						$mdDialog.show(
							$mdDialog.alert()
							.parent(angular.element(document.querySelector('#popupContainer')))
							.clickOutsideToClose(false)
							.textContent('O CPF ' +cpf+ ' não possui certificado.')
							.ok('OK')
							.targetEvent(ev)
						);
					};
					showAlert();
				}
			})
			.error(function(status) {
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

		$scope.showEmitCertificate = function(ev) {
			var confirm = $mdDialog.prompt()
			.title('Insira seu CPF')
			.placeholder('CPF')
			.ariaLabel('CPF')
			.targetEvent(ev)
			.ok('Buscar')
			.cancel('Fechar');
			$mdDialog.show(confirm).then(function(result) {
				buscarCPF(result);
			}, function() {});
		};

		let visualizarCertificados = function(dadosMostra,avaliador,participante,orientador,aluno,semanaAcademica,saberesDocentes,oficina,presenca_oficina,premiados,mencao_honrosa,presenca_saberes,numCertificados,ev) {
			$mdDialog.show({
				controller: function dialogCertificateController($scope, $window, $mdDialog) {
					$scope.avaliador = [];
					$scope.participante = [];
					$scope.orientador = [];
					$scope.aluno = [];
					$scope.semanaAcademica = [];
					$scope.saberesDocentes= [];
					$scope.oficina = [];
					$scope.presenca_oficina = [];
					$scope.premiados = [];
					$scope.mencao_honrosa = [];
					$scope.presenca_saberes = [];

					$scope.avaliador = avaliador;
					$scope.participante = participante;
					$scope.orientador = orientador;
					$scope.aluno = aluno;
					$scope.semanaAcademica = semanaAcademica;
					$scope.saberesDocentes= saberesDocentes;
					$scope.oficina = oficina;
					$scope.countCertificados = numCertificados;
					$scope.presenca_oficina = presenca_oficina;
					$scope.premiados = premiados;
					$scope.mencao_honrosa = mencao_honrosa;
					$scope.presenca_saberes = presenca_saberes;

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

					$scope.emitirCertificado1 = function(tipo,modo,dados) {
						var ano2 = new Date(dados.createdAt);
						var dados_certificado = {};
						var texto = "";

						//loopa pelos dados das mostras e encontra a mostra que melhor se encaixa naquele certificado
						// for(var i = dadosMostra.length - 1; i >= 0; i--){
						// 	var ano_certificado = new Date(dadosMostra[i].createdAt)
						// 	if(ano_certificado < ano2){
						// 		dados_certificado = dadosMostra[i];
						// 		break;
						// 	}
						// }	


						//Itera pelos certificados para encontrar o layout necessário
						var isso = true;
						var i = 0;
						
						//procura o layout correto de certificado
						while(isso){
							if(dadosMostra[i].ano_certificado == ano2.getFullYear()){
								dados_certificado = dadosMostra[i];
								isso = false;
							}
							i++;
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
						}

						//usa regex pra alterar as chaves no texto pela informação correspondente Ex: ¨nome -> Mateus R. Algayer,
						//¨nomeProjeto -> PDIAPIA, e assim por diante
						while(texto.match(/¨\w+/) != null){

							texto = texto.replace(/¨\w+/, (str = texto.match(/¨\w+/)) => {
								
								for (let chave in dados) {
									if(str == "¨"+chave){
										return dados[chave].toUpperCase(); 
									}
								}
							});
						}

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
							pdfMake.createPdf(docDefinition).download('Certificado_'+tipo+'_MOVACI_'+ano2.getFullYear()+'.pdf');
						}
					}

					$scope.emitirCertificado2 = function(modo,dados) {
						var dados_certificado = {};
						var texto = "";
						console.log(dadosMostra);
						// var texto = ['Certificamos que ' +dados.nome.toUpperCase()+ ' participou do IV Seminário Saberes Docentes, com '+
						// 'carga horária de ' +dados.cargaHoraria+ ' hora (s), nos dias 26 e 27 de setembro de 2016, que integrou a programação da ',
						// {text: 'V MOVACI - Mostra Venâncio-airense de Cultura e Inovação, do Instituto Federal de Educação, Ciência e '+
						// 'Tecnologia Sul-rio-grandense, ',bold: true}, 'IFSul, Câmpus Venâncio Aires, ocorrida de 28 a 30 de setembro de 2016.\n\n'];

						//Itera pelos certificados para encontrar o layout necessário
						var isso = true;
						var i = 0;
						
						//procura o layout correto de certificado
						while(isso){
							if(dadosMostra[i].ano_certificado == dados.ano){
								dados_certificado = dadosMostra[i];
								isso = false;
							}
							i++;
						}	
						//pega o texto que vai ser utilizado no certificado
						texto = dados_certificado.textoDocentes;
						// var url_1 = window.localStorage.getItem('url1');
						// var url_2 = window.sessionStorage.getItem('url2');

						//usa regex pra alterar as chaves no texto pela informação correspondente Ex: ¨nome -> Mateus R. Algayer,
						//¨nomeProjeto -> PDIAPIA, e assim por diante
						while(texto.match(/¨\w+/) != null){

							texto = texto.replace(/¨\w+/, (str = texto.match(/¨\w+/)) => {
								
								for (let chave in dados) {
									if(str == "¨"+chave){
										return dados[chave].toUpperCase(); 
									}
								}
							});
						}

						var docDefinition = {
							pageSize: 'A4',
							pageOrientation: 'landscape',
							background: function(currentPage) {
								console.log(currentPage);
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
					}
					$scope.hide = function() {
						$mdDialog.hide();
					};
					$scope.cancel = function() {
						$mdDialog.cancel();
					};
				},
				templateUrl: 'views/details.certificado.html',
				parent: angular.element(document.body),
				targetEvent: ev,
				clickOutsideToClose: false,
				fullscreen: true // Only for -xs, -sm breakpoints.
			});
		};
	});
})();
