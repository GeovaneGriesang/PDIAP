(function(){
	'use strict';

	angular
	.module('PDIAP')
	.controller('avaliadorDashboardCtrl', function($scope, $rootScope, $state, $window, $http, $mdToast, avaliadorAPI, projetosAPI, contaAPI) {

		$scope.avaliador = $rootScope.avaliadorLogado || {};
		$scope.certificados = [];

		// Login único: esta mesma Pessoa também pode ser Participante (ver
		// routes/index.js#/dashboard/trocar-papel) - troca sem pedir senha de novo.
		$scope.trocarPainel = function() {
			contaAPI.trocarPapel()
			.then(function() {
				$state.go('participanteDashboard');
			}, function(response) {
				console.log('Error: ' + response.data);
			});
		};

		// Se por algum motivo chegou aqui sem ter definido senha ainda (ex: voltou pelo
		// histórico do navegador), manda pra tela obrigatória em vez de mostrar o dashboard.
		if (!$scope.avaliador.senhaDefinida) {
			$window.location.href = '/avaliadores/dashboard/trocar-senha';
			return;
		}

		avaliadorAPI.getCertificados()
		.then(function(response) {
			$scope.certificados = response.data;
		}, function(response) {
			console.log('Error: ' + response.data);
		});

		var meses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

		// Gera o certificado de avaliador em PDF (mesma lógica do branch 'Avaliador' de
		// emitirCertificado1 em homeCtrl.js, só que a partir dos dados de quem já está
		// logado, sem precisar pedir CPF de novo).
		$scope.baixarCertificado = function(cert) {
			projetosAPI.getMostra()
			.then(function(response) {
				var dadosMostra = response.data;
				var ano = new Date(cert.createdAt).getFullYear();
				var dadosCertificado = null;
				for (var i = 0; i < dadosMostra.length; i++) {
					if (dadosMostra[i].ano_certificado == ano) { dadosCertificado = dadosMostra[i]; break; }
				}
				if (!dadosCertificado) {
					$scope.toast('Certificado do ano ' + ano + ' ainda não foi cadastrado.', 'failed-toast');
					return;
				}

				var texto = dadosCertificado.textoAvaliador || '';
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
				pdfMake.createPdf(docDefinition).download('Certificado_Avaliador_MOVACI_' + ano + '.pdf');
			}, function(response) {
				console.log('Error: ' + response.data);
			});
		};

		$scope.toast = function(message, tema) {
			var toast = $mdToast.simple().textContent(message).action('✖').position('top right').theme(tema).hideDelay(6000);
			$mdToast.show(toast);
		};

		// A rota /projetos/logout usada em outras telas do app não existe de verdade
		// (não achamos handler nenhum pra ela em routes/projetos.js) - usa a rota raiz
		// /logout (routes/index.js), que funciona pra qualquer sessão autenticada.
		$scope.logout = function() {
			$http.post('/logout').then(function() {
				$window.location.href = '/';
			});
		};
	});
})();
