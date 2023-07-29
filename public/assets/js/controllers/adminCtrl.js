(function(){
	'use strict';

	angular
	.module('PDIAP')
	.controller('adminCtrl', function($scope, $rootScope, $window, $location, $mdSidenav, $mdToast, projetosAPI) {

		$scope.projeto = {};
		$scope.projeto1 = {};
		$scope.projeto2 = {};
		// $scope.projeto3 = {};
		// $scope.projeto4 = {};
		$scope.projeto5 = {};
		$scope.conta = {};
		$scope.projetoEmail = '';
		$scope.integrantes = [];
		$rootScope.header = 'Dashboard';

		$scope.mostraResumo = function() {
			$window.open('http://www.movaci.com.br/alpha/documentos/Modelo_Resumo_MOVACI.doc', '_blank');
		}
		$scope.mostraRelatorio = function() {
			$window.open('http://www.movaci.com.br/alpha/documentos/Modelo_Relatorio_MOVACI.docx', '_blank');
		}
		$scope.mostraResumoPDF = function() {
			$window.open('http://www.movaci.com.br/alpha/documentos/Modelo_Resumo_MOVACI.pdf', '_blank');
		}
		$scope.mostraRelatorioPDF = function() {
			$window.open('http://www.movaci.com.br/alpha/documentos/Modelo_Relatorio_MOVACI.pdf', '_blank');
		}

		//essa função mostra os projetos aprovados quando é clicado o botão na parte dashboard quado logado
		$scope.mostraAprovados = function() {
			$window.open('http://www.movaci.com.br/alpha/documentos/Lista_Aprovados_MOVACI.pdf', '_blank');
		}
		$scope.mostraApresentacao = function() {

			$window.open('http://www.movaci.com.br/alpha/documentos/Apresentação_eixos_e_salas_MOVACI.pdf', '_blank');
		}

		let maskCEP = function() {
			$scope.projeto2.cep = $scope.projeto2.cep.substring(0,2) + "." + $scope.projeto2.cep.substring(2);
			$scope.projeto2.cep = $scope.projeto2.cep.substring(0,6) + "-" + $scope.projeto2.cep.substring(6);
		};

		let carregarProjeto = function() {
			projetosAPI.getProjeto()
			.success(function(projeto) {
				$scope.nomeDoProjeto = projeto.nomeProjeto;
				$scope.projeto = projeto;
				//console.log(projeto);
				$scope.aviso1_2 = '';
				if (projeto.aprovado === true) {
					if (projeto.participa === true) {
						$scope.aviso1_1 = 'PARABÉNS!';
						$scope.aviso1_2 = 'Esse projeto foi aprovado e já está confirmado para participar da '+
						'Mostra Venâncio-airense de Cultura e Inovação. Bom trabalho!';
					} else if (projeto.participa === false) {
						$scope.aviso1_2 = 'Esse projeto foi aprovado, mas devido a escolha, está fora da lista de confirmados para a '+
						'Mostra Venâncio-airense de Cultura e Inovação.';
					} else {
						$scope.aviso1_1 = 'PARABÉNS!';
						$scope.aviso1_2 = 'Esse projeto foi aprovado, porém AINDA NÃO CONFIRMOU PRESENÇA na '+
						'Mostra Venâncio-airense de Cultura e Inovação. Vá em "Alterar Projeto" e "Marcar Participação", '+
						'favor entre em contato.';
					}
				} else if(projeto.aprovado === false) {
					$scope.aviso1_2 = 'Infelizmente, esse projeto não foi selecionado para apresentação na MOVACI. '+
					'Mas não desanime! Não estar selecionado não quer dizer que seu projeto não seja bom ou possa atingir o sucesso. '+
					'Infelizmente não temos como escolher todos os projetos. '+
					'Fique atento! Há uma lista de suplência. Em caso de desistências, serão chamados novos projetos.';
				}

				$scope.projeto1.nomeProjeto = projeto.nomeProjeto;
				$scope.projeto1.categoria = projeto.categoria;
				$scope.projeto1.eixo = projeto.eixo;
				$scope.projeto1.resumo = projeto.resumo;
				$scope.projeto1.participa = projeto.participa;

				if (projeto.palavraChave === undefined) {
					$scope.palavraChave = [];
				} else {
					$scope.palavraChave = projeto.palavraChave.split(",");
				}

				$scope.projeto2.nomeEscola = projeto.nomeEscola;
				$scope.projeto2.estado = projeto.estado;
				$scope.projeto2.cidade = projeto.cidade;
				$scope.projeto2.cep = projeto.cep;
				maskCEP();

				$scope.conta.email = projeto.email;
				$scope.conta.username = projeto.username;
				$scope.projetoEmail = projeto.email;

				$scope.projeto5.hospedagem = [];
				if (projeto.hospedagem !== undefined && projeto.hospedagem !== "") {
					$scope.projeto5.hospedagem = projeto.hospedagem.split(",");
					// console.log($scope.projeto5.hospedagem);
					$scope.hospedagemVerify = 'Sim';
				} else {
					$scope.hospedagemVerify = 'Não';
				}

				if (projeto.relatorio2 !== undefined) {
					$scope.f = projeto.relatorio2;
					$scope.calcSize = projeto.relatorio2.size/1000;
					$scope.calcSize = parseFloat($scope.calcSize).toFixed(2);
					$scope.progresso = 'Status';
					$scope.status = 'check';
					$scope.statusColor = '#43a047';
					$scope.statusText = 'Enviado';
				}

				if (projeto.eixo === 'Ciências da Computação') {
					$scope.badget = 'responsive';
				} else if (projeto.eixo === 'Engenharias') {
					$scope.badget = 'rocket';
				} else if (projeto.eixo === 'Línguas e Artes') {
					$scope.badget = 'library';
				} else if (projeto.eixo === 'Ciências Agrárias, Exatas e da Terra') {
					$scope.badget = 'chart-areaspline';
				} else if (projeto.eixo === 'Ciências Ambientais, Biológicas e da Saúde') {
					$scope.badget = 'leaf';
				} else if (projeto.eixo === 'Ciências Humanas e Sociais Aplicadas') {
					$scope.badget = 'account-multiple';
				} else if (projeto.eixo === 'Extensão') {
					$scope.badget = 'projector-screen';
				} else if (projeto.eixo === 'Ciências da Natureza e suas tecnologias') {
					$scope.badget = 'leaf';
				} else if (projeto.eixo === 'Ciências Humanas e suas tecnologias') {
					$scope.badget = 'library';
				} else if (projeto.eixo === 'Linguagens, Códigos e suas tecnologias') {
					$scope.badget = 'code-tags';
				} else if (projeto.eixo === 'Matemática e suas tecnologias') {
					$scope.badget = 'chart-bar';
				}
				 /*for (var i in projeto.integrantes){
				 	$scope.integrantes.push(projeto.integrantes[i]);
				 }*/
				if ($scope.projeto1.categoria === 'Ensino Médio, Técnico e Superior') {
					$scope.data = {
						sidenav: {
							sections: [{
								name: 'Dashboard',
								expand: false,
								actions: [{
									name: 'Dashboard',
									icon: 'view-dashboard',
									link: 'home'
								},
								
								//Descomentar para aparecer o botão de alterar dados do projeto
								 {
								 	name: 'Alterar projeto',
								 	icon: 'flask',
								 	link: 'home.update'
								 },
								 
								//Descomentar para aparecer o botão de upload de relatórios
								 {
								 	name: 'Upload',
								 	icon: 'upload',
								 	link: 'home.fileUpload'
								 },
								{
									name: 'Dados da conta',
									icon: 'account-settings-variant',
									link: 'home.conta'
								}]
							}//,
							// {
							// 	name: 'Avaliação',
							// 	expand: false,
							// 	actions: [{
							// 		name: 'Ensino Fundamental',
							// 		icon: 'lead-pencil',
							// 		link: 'home.avaliacao-fundamental'
							// 	}, {
							// 		name: 'Ensino Médio',
							// 		icon: 'pen',
							// 		link: 'home.avaliacao-medio'
							// 	}, {
							// 		name: 'Ensino Médio - Ext',
							// 		icon: 'pen',
							// 		link: 'home.avaliacao-medio-extensao'
							// 	}]
							// }
							]
						}
					};
				} else {
					$scope.data = {
						sidenav: {
							sections: [{
								name: 'Dashboard',
								expand: false,
								actions: [{
									name: 'Dashboard',
									icon: 'view-dashboard',
									link: 'home'
								},
								
								//Descomentar para aparecer o botão de alterar dados do projeto
								 {
								 	name: 'Alterar projeto',
								 	icon: 'flask',
								 	link: 'home.update'
								},
								{
									name: 'Dados da conta',
									icon: 'account-settings-variant',
									link: 'home.conta'
								}]}
							// },{
							// 	name: 'Avaliação',
							// 	expand: false,
							// 	actions: [{
							// 		name: 'Ensino Fundamental',
							// 		icon: 'lead-pencil',
							// 		link: 'home.avaliacao-fundamental'
							// 	}, {
							// 		name: 'Ensino Médio',
							// 		icon: 'pen',
							// 		link: 'home.avaliacao-medio'
							// 	}, {
							// 		name: 'Ensino Médio - Ext',
							// 		icon: 'pen',
							// 		link: 'home.avaliacao-medio-extensao'
							// 	}]
							// }
							]
						}
					};
				}
			});
		};
		$scope.carregarProjeto = carregarProjeto;

		$scope.toggleSidenav = function(menu) {
			$mdSidenav(menu).toggle();
		};
		$scope.toast = function(message,tema) {
			var toast = $mdToast.simple().textContent(message).action('✖').position('top right').theme(tema).hideDelay(10000);
			$mdToast.show(toast);
		};

	});
})();
