(function(){
	'use strict';

	angular
	.module('PDIAP')
	.controller('participanteDashboardCtrl', function($scope, $rootScope, $window, $http, $mdToast, participanteAPI, projetosAPI) {

		$scope.participante = $rootScope.participanteLogado || {};
		$scope.certificados = { oficina: null, saberes: null };

		// Se por algum motivo chegou aqui sem ter definido senha ainda (ex: voltou pelo
		// histórico do navegador), manda pra tela obrigatória em vez de mostrar o dashboard.
		if (!$scope.participante.senhaDefinida) {
			$window.location.href = '/participantes/dashboard/trocar-senha';
			return;
		}

		participanteAPI.getCertificados()
		.success(function(certificados) {
			$scope.certificados = certificados;
		})
		.error(function(status) {
			console.log('Error: ' + status);
		});

		var meses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

		function encontrarDadosCertificado(dadosMostra, ano) {
			for (var i = 0; i < dadosMostra.length; i++) {
				if (dadosMostra[i].ano_certificado == ano) return dadosMostra[i];
			}
			return null;
		}

		// Certificado de Oficina - mesma lógica do branch 'Presenca-oficinas' de
		// emitirCertificado1 em homeCtrl.js, a partir dos dados de quem já está logado.
		$scope.baixarCertificadoOficina = function() {
			var cert = $scope.certificados.oficina;
			projetosAPI.getMostra()
			.success(function(dadosMostra) {
				var dadosCertificado = encontrarDadosCertificado(dadosMostra, cert.ano);
				if (!dadosCertificado) {
					$scope.toast('Certificado do ano ' + cert.ano + ' ainda não foi cadastrado.', 'failed-toast');
					return;
				}

				var texto = dadosCertificado.textoPOficinas || '';
				while (texto.match(/¨\w+/) != null) {
					texto = texto.replace(/¨\w+/, function(str) {
						var chave = str.slice(1);
						return cert[chave] !== undefined ? String(cert[chave]).toUpperCase() : str;
					});
				}

				var agora = new Date();
				var docDefinition = {
					pageSize: 'A4',
					pageOrientation: 'landscape',
					background: [{ image: dadosCertificado.imagem, width: 841, alignment: 'center' }],
					content: [
						{ text: texto + "\n\n\n\n", alignment: 'justify', margin: [50,210,50,0], fontSize: 16 },
						{ text: 'Venâncio Aires, ' + meses[agora.getMonth()] + ' de ' + agora.getFullYear() + '.', alignment: 'center', fontSize: 14 }
					],
					footer: [{
						text: 'Número de validação: ' + cert.token + '. As informações deste certificado podem ser validadas em www.movaci.com.br/certificados.',
						alignment: 'center', fontSize: 11
					}]
				};
				pdfMake.createPdf(docDefinition).download('Certificado_Oficinas_MOVACI_' + cert.ano + '.pdf');
			})
			.error(function(status) {
				console.log('Error: ' + status);
			});
		};

		// Certificado de Seminário Saberes Docentes - mesma lógica de emitirCertificado2
		// em homeCtrl.js (2 páginas: texto principal + página com a lista de eventos).
		$scope.baixarCertificadoSaberes = function() {
			var cert = $scope.certificados.saberes;
			projetosAPI.getMostra()
			.success(function(dadosMostra) {
				var dadosCertificado = encontrarDadosCertificado(dadosMostra, cert.ano);
				if (!dadosCertificado) {
					$scope.toast('Certificado do ano ' + cert.ano + ' ainda não foi cadastrado.', 'failed-toast');
					return;
				}

				var texto = dadosCertificado.textoDocentes || '';
				while (texto.match(/¨\w+/) != null) {
					texto = texto.replace(/¨\w+/, function(str) {
						var chave = str.slice(1);
						return cert[chave] !== undefined ? String(cert[chave]).toUpperCase() : str;
					});
				}

				var agora = new Date();
				var docDefinition = {
					pageSize: 'A4',
					pageOrientation: 'landscape',
					background: function(currentPage) {
						var imgUrl = currentPage === 1 ? dadosCertificado.imagem : dadosCertificado.imagemFundo;
						return [{ image: imgUrl, width: 841, alignment: 'center' }];
					},
					content: [
						{ text: texto + "\n\n\n\n", alignment: 'justify', margin: [50,210,50,0], fontSize: 16 },
						{ text: 'Venâncio Aires, ' + meses[agora.getMonth()] + ' de ' + agora.getFullYear() + '.', alignment: 'center', fontSize: 14, pageBreak: 'after' },
						{ text: 'EVENTOS:\n\n\n' + cert.eventos, fontSize: 14, margin: [0,60,0,0] }
					],
					footer: function(currentPage) {
						if (currentPage === 1) {
							return [{
								text: 'Número de validação: ' + cert.token + '. As informações deste certificado podem ser validadas em www.movaci.com.br/certificados.',
								alignment: 'center', fontSize: 11
							}];
						}
					}
				};
				pdfMake.createPdf(docDefinition).download('Certificado_SaberesDocentes_MOVACI_' + cert.ano + '.pdf');
			})
			.error(function(status) {
				console.log('Error: ' + status);
			});
		};

		$scope.toast = function(message, tema) {
			var toast = $mdToast.simple().textContent(message).action('✖').position('top right').theme(tema).hideDelay(6000);
			$mdToast.show(toast);
		};

		$scope.logout = function() {
			$http.post('/logout').then(function() {
				$window.location.href = '/';
			});
		};
	});
})();
