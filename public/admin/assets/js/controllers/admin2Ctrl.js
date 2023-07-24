(function(){
	'use strict';

	angular
	.module('PDIAPa')
	.controller('admin2Ctrl', function($scope, $rootScope, $window, $mdDialog, adminAPI) { //adicionar importação de Projetos

		// $scope.projetos = new Projetos();

		$scope.projetos = [];
		$scope.saberes = [];
		$scope.avaliadores = [];

		let relatorio = ({
			countAprovados: 0,
			countParticipaSim: 0,
			countParticipaNao: 0,
			countPendente: 0
		});

		let eixo = [{nome:"Ciências da Natureza e suas tecnologias", num:0, categoria: "Fundamental I (1º ao 5º anos)"},
			    {nome:"Ciências Humanas e suas tecnologias", num:0, categoria: "Fundamental I (1º ao 5º anos)"},
			    {nome:"Linguagens, Códigos e suas tecnologias", num:0, categoria: "Fundamental I (1º ao 5º anos)"},
			    {nome:"Matemática e suas tecnologias", num:0, categoria: "Fundamental I (1º ao 5º anos)"},
			    {nome:"Ciências da Natureza e suas tecnologias", num:0, categoria: "Fundamental II (6º ao 9º anos)"},
			    {nome:"Ciências Humanas e suas tecnologias", num:0, categoria: "Fundamental II (6º ao 9º anos)"},
			    {nome:"Linguagens, Códigos e suas tecnologias", num:0, categoria: "Fundamental II (6º ao 9º anos)"},
			    {nome:"Matemática e suas tecnologias", num:0, categoria: "Fundamental II (6º ao 9º anos)"},
			    {nome:"Ciências Agrárias, Exatas e da Terra", num:0, categoria: "Ensino Médio, Técnico e Superior"},
			    {nome:"Ciências Ambientais, Biológicas e da Saúde", num:0, categoria: "Ensino Médio, Técnico e Superior"},
			    {nome:"Ciências Humanas e Sociais Aplicadas", num:0, categoria: "Ensino Médio, Técnico e Superior"},
			    {nome:"Línguas e Artes", num:0, categoria: "Ensino Médio, Técnico e Superior"},
			    {nome:"Extensão", num:0, categoria: "Ensino Médio, Técnico e Superior"},
			    {nome:"Ciências da Computação", num:0, categoria: "Ensino Médio, Técnico e Superior"},
			    {nome:"Engenharias", num:0, categoria: "Ensino Médio, Técnico e Superior"}];

		let totalQtd = ({
			nome: "Geral",
			countTotal: 0,
			countHospedagem: 0,
			countFundamentalI: 0,
			countFundamentalII: 0,
			countEnsinoMedio: 0,
			countCamisetasP: 0,
			countCamisetasM: 0,
			countCamisetasG: 0,
			countEscolas:[{
				nome: "",
				num: 0
			}],
			countEixo: [{},{},{},{},{},{},{},{},{},{},{},{},{},{},{}]			
		});
		let aprovadosQtd = ({
			nome: "Aprovados",
			countTotal: 0,
			countHospedagem: 0,
			countFundamentalI: 0,
			countFundamentalII: 0,
			countEnsinoMedio: 0,
			countCamisetasP: 0,
			countCamisetasM: 0,
			countCamisetasG: 0,
			countEscolas:[{
				nome: "",
				num: 0
			}],
			countEixo: [{},{},{},{},{},{},{},{},{},{},{},{},{},{},{}]			
		});
		let canceladosQtd = ({
			nome: "Cancelados/Pendentes",
			countTotal: 0,
			countHospedagem: 0,
			countFundamentalI: 0,
			countFundamentalII: 0,
			countEnsinoMedio: 0,
			countCamisetasP: 0,
			countCamisetasM: 0,
			countCamisetasG: 0,
			countEscolas:[{
				nome: "",
				num: 0
			}],
			countEixo: [{},{},{},{},{},{},{},{},{},{},{},{},{},{},{}]			
		});

		for(var x = 0; x<eixo.length;x++){
			totalQtd.countEixo[x].nome = eixo[x].nome;
			totalQtd.countEixo[x].num = eixo[x].num;
			totalQtd.countEixo[x].categoria = eixo[x].categoria;

			aprovadosQtd.countEixo[x].nome = eixo[x].nome;
			aprovadosQtd.countEixo[x].num = eixo[x].num;
			aprovadosQtd.countEixo[x].categoria = eixo[x].categoria;

			canceladosQtd.countEixo[x].nome = eixo[x].nome;
			canceladosQtd.countEixo[x].num = eixo[x].num;
			canceladosQtd.countEixo[x].categoria = eixo[x].categoria;
		}

		$scope.abrir = function(num) {
			console.log(num);
			$window.open('http://www.movaci.com.br/relatorios_2018/'+num+'.pdf', '_blank');			
		}

		$scope.carregarProjetos = function(ano2) {
			adminAPI.getTodosProjetos(ano2)
			.success(function(projetos) {
				angular.forEach(projetos, function (value, key) {
					var ano = new Date(value.createdAt).getFullYear();
					if(ano == $scope.ano){
					var hosp = value.hospedagem;				
					var aprovado = 0;
					var cancelado = 0;
					if(value.aprovado === true){
						aprovado = 1;
						cancelado = 1;
						if(value.participa === true){
							cancelado = 0;
						}
					}
					//Total
					totalQtd.countTotal++;
					aprovadosQtd.countTotal += aprovado;
					canceladosQtd.countTotal += cancelado;
					//Hospedagem
					//console.log("HOSP:"+hosp+" | ");
					if(hosp != undefined && hosp !== ""){
						totalQtd.countHospedagem++;
						aprovadosQtd.countHospedagem += aprovado;
						canceladosQtd.countHospedagem += cancelado;
						if(hosp.indexOf(",") != -1){
							totalQtd.countHospedagem++;
							aprovadosQtd.countHospedagem += aprovado;
							canceladosQtd.countHospedagem += cancelado;
							if(hosp.indexOf(",",hosp.indexOf(",")+1) != -1){
								totalQtd.countHospedagem++;
								aprovadosQtd.countHospedagem += aprovado;
								canceladosQtd.countHospedagem += cancelado;
							}
						}
					}
					//console.log("TOTAL_HOSP:"+totalQtd.countHospedagem);
					//Categoria
					var categoria = value.categoria;
					if(categoria === "Fundamental I (1º ao 5º anos)"){
						totalQtd.countFundamentalI++;
						aprovadosQtd.countFundamentalI += aprovado;
						canceladosQtd.countFundamentalI += cancelado;
					} else if(categoria === "Fundamental II (6º ao 9º anos)"){
						totalQtd.countFundamentalII++;
						aprovadosQtd.countFundamentalII += aprovado;
						canceladosQtd.countFundamentalII += cancelado;
					} else if(categoria === "Ensino Médio, Técnico e Superior"){
						totalQtd.countEnsinoMedio++;
						aprovadosQtd.countEnsinoMedio += aprovado;
						canceladosQtd.countEnsinoMedio += cancelado;
					}
					//Escolas
					var nomeEscola = value.nomeEscola;
					var teste = false, teste2 = false, teste3 = false;
					for(var x = 0; x<totalQtd.countEscolas.length; x++){
						if(nomeEscola === totalQtd.countEscolas[x].nome){
							totalQtd.countEscolas[x].num++;
							teste = true;
						}												
					}
					for(var x = 0; x<aprovadosQtd.countEscolas.length; x++){
						if(nomeEscola === aprovadosQtd.countEscolas[x].nome){
							aprovadosQtd.countEscolas[x].num+=aprovado;
							teste2 = true;
						}
					}
					for(var x = 0; x<canceladosQtd.countEscolas.length; x++){
						if(nomeEscola === canceladosQtd.countEscolas[x].nome){
							canceladosQtd.countEscolas[x].num+=cancelado;
							teste3 = true;
						}
					}
					if(teste === false){
						var escola = {
							nome: nomeEscola,
							num: 1
						};
						totalQtd.countEscolas.push(escola);
					}
					if(teste2 === false && aprovado == 1){
						var escola = {
							nome: nomeEscola,
							num: 1
						};
						aprovadosQtd.countEscolas.push(escola);
					}
					if(teste3 === false && cancelado == 1){
						var escola = {
							nome: nomeEscola,
							num: 1
						};
						canceladosQtd.countEscolas.push(escola);
					}				
					//Camisetas
					var integrantes = value.integrantes;
					for(var x = 0; x<integrantes.length; x++){
						if(integrantes[x].tamCamiseta === "P"){
							totalQtd.countCamisetasP++;
							aprovadosQtd.countCamisetasP += aprovado;
							canceladosQtd.countCamisetasP += cancelado;	
						} else if(integrantes[x].tamCamiseta === "M"){
							totalQtd.countCamisetasM++;
							aprovadosQtd.countCamisetasM += aprovado;
							canceladosQtd.countCamisetasM += cancelado;
						} else if(integrantes[x].tamCamiseta === "G"){
							totalQtd.countCamisetasG++;
							aprovadosQtd.countCamisetasG += aprovado;
							canceladosQtd.countCamisetasG += cancelado;
						}  
					}
					//Eixos
					for(var x = 0; x<eixo.length; x++){
						if(value.eixo === eixo[x].nome && categoria === eixo[x].categoria){
							totalQtd.countEixo[x].num++;
							aprovadosQtd.countEixo[x].num += aprovado;
							canceladosQtd.countEixo[x].num += cancelado;
						}						
					}
					
					if (value.aprovado === true) {
						relatorio.countAprovados++;
						if (value.participa === true) {
							relatorio.countParticipaSim++;
						} else if(value.participa === false) {
							relatorio.countParticipaNao++;
						} else {
							relatorio.countPendente++;
						}
					}
					let orientadores = "";
					let alunos = "";
					let hospedagem = value.hospedagem;
					angular.forEach(value.integrantes, function (value, key) {
						if (value.tipo === 'Orientador') {
							if (orientadores !== "") {
								orientadores = orientadores+", "+value.nome+" ("+value.telefone+") - ("+value.tamCamiseta+")";
							} else {
								orientadores = value.nome+" ("+value.telefone+") - ("+value.tamCamiseta+")";
							}
						}
						if (value.tipo === 'Aluno') {
							if (alunos !== "") {
								alunos = alunos+", "+value.nome+" ("+value.telefone+") - ("+value.tamCamiseta+")";
							} else {
								alunos = value.nome+" ("+value.telefone+") - ("+value.tamCamiseta+")";
							}
						}
					});

					
					
						let obj = ({
							_id: value._id.$oid,
							numInscricao: value.numInscricao,
							nomeProjeto: value.nomeProjeto,
							nomeEscola: value.nomeEscola,
							categoria: value.categoria,
							eixo: value.eixo,
							orientadores: orientadores,
							alunos: alunos,
							resumo: value.resumo,
							aprovado: value.aprovado,
							participa: value.participa,
							hospedagem: hospedagem,
							createdAt: ano
						});
						$scope.projetos.push(obj);
					}

					
					
				});
			})
			.error(function(status) {
				console.log(status);
			});
		};

		$scope.carregarSaberes = function() {
			adminAPI.getTodosSaberes()
			.success(function(saberes) {
				angular.forEach(saberes, function(value, key){
					var ano = new Date(value.createdAt).getFullYear();
					if(ano == $scope.ano){
						//console.log("VALUE:"+JSON.stringify(value));
						let obj = value;
						obj.createdAt = ano;
						$scope.saberes.push(obj);
					}
				});
			})	
			.error(function(status) {
				console.log(status);
			});
		};

		$scope.carregarAvaliadores = function() {
			adminAPI.getTodosAvaliadores()
			.success(function(avaliadores) {
				angular.forEach(avaliadores, function(value, key){
					var ano = new Date(value.createdAt).getFullYear();
					if(ano == $scope.ano){
						let obj = value;
						obj.createdAt = ano;
						$scope.avaliadores.push(obj);
					}					
				});

			})
			.error(function(status) {
				console.log(status);
			});
		};

		$scope.ordenarPor = function(campo) {
			$scope.ordenacao = campo;
		}
		$scope.setBusca = function(campo) {
			$scope.query = campo;
			delete $scope.search;
		}

		$scope.year = CadastraAno();
		$scope.recarregar = function(){
			$scope.projetos = [];
			$scope.saberes = [];
			$scope.avaliadores = [];
			$scope.resetarVariaveis();
			$scope.carregarProjetos($scope.ano);
			$scope.carregarSaberes();
			$scope.carregarAvaliadores();
			totalQtd.countEscolas.splice(0,1);
			aprovadosQtd.countEscolas.splice(0,1);
			canceladosQtd.countEscolas.splice(0,1);
			$rootScope.qtd = totalQtd;
			$rootScope.qtdA = aprovadosQtd;
			$rootScope.qtdC = canceladosQtd;
			$rootScope.relatorio = relatorio;
			
		}

		$scope.setarProjetos = function() {
			$scope.ordenacao = ['aprovado','participa'];
			$scope.query = 'nomeProjeto';
			$scope.textOrdenacao = [
				{text:'Aprovados',action:['aprovado','participa'],selected:true},
				{text:'Categoria/eixo',action:['categoria','eixo']},
				{text:'Nº de Inscrição',action:'numInscricao'},
				{text:'Nome do projeto',action:'nomeProjeto'},
				{text:'Escola',action:'nomeEscola'}
			];
			$scope.textQuery = [
				{text:'Nome do projeto',action:'nomeProjeto'},
				{text:'Escola',action:'nomeEscola'},
				{text:'Categoria',action:'categoria'},
				{text:'Eixo',action:'eixo'},
				{text:'Orientador',action:'orientadores'}
			];
		}
		$scope.setarSaberes = function() {
			$scope.ordenacao = 'nome';
			$scope.query = 'nome';
			$scope.textOrdenacao = [
				{text:'Nome',action:'nome',selected:true},
				{text:'Tipo',action:'tipo'},
				{text:'Escola',action:'escola'}
			];
			$scope.textQuery = [
				{text:'Nome',action:'nome'},
				{text:'Escola',action:'escola'},
				{text:'CPF',action:'cpf'},
				{text:'Email',action:'email'}
			];
		}
		$scope.setarAvaliadores = function() {
			$scope.ordenacao = ['categoria','eixo'];
			$scope.query = 'nome';
			$scope.textOrdenacao = [
				{text:'Categoria/eixo',action:['categoria','eixo'],selected:true},
				{text:'Nome',action:'nome'},
				{text:'Nível Acadêmico',action:'nivelAcademico'}
			];
			$scope.textQuery = [
				{text:'Nome',action:'nome'},
				{text:'CPF',action:'cpf'},
				{text:'Email',action:'email'},
				{text:'Atuação Pro.',action:'atuacaoProfissional'},
				{text:'Nível Acadêmico',action:'nivelAcademico'},
				{text:'Categoria',action:'categoria'},
				{text:'Eixo',action:'eixo'}
			];
		}

		$scope.visualizarDetalhes = function(projeto,ev) {
			//console.log("PROJETO:"+JSON.stringify(projeto));
			$mdDialog.show({
				controller: function dialogController($scope, $mdDialog) {
					$scope.details = projeto;
					$scope.hide = function() {
						$mdDialog.hide();
					};
					$scope.cancel = function() {
						$mdDialog.cancel();
					};
				},
				templateUrl: 'admin/views/details.projetos.html',
				parent: angular.element(document.body),
				targetEvent: ev,
				clickOutsideToClose: false,
				fullscreen: true // Only for -xs, -sm breakpoints.
			});
		};

		$scope.visualizarDetalhes1 = function(saberes,ev) {
			$mdDialog.show({
				controller: function dialogController($scope, $mdDialog) {
					$scope.details = saberes;
					$scope.hide = function() {
						$mdDialog.hide();
					};
					$scope.cancel = function() {
						$mdDialog.cancel();
					};
				},
				templateUrl: 'admin/views/details.saberes.html',
				parent: angular.element(document.body),
				targetEvent: ev,
				clickOutsideToClose: false,
				fullscreen: true // Only for -xs, -sm breakpoints.
			});
		};

		$scope.visualizarDetalhes2 = function(avaliadores,ev) {
			$mdDialog.show({
				controller: function dialogController($scope, $mdDialog) {
					$scope.details = avaliadores;
					$scope.hide = function() {
						$mdDialog.hide();
					};
					$scope.cancel = function() {
						$mdDialog.cancel();
					};
				},
				templateUrl: 'admin/views/details.avaliadores.html',
				parent: angular.element(document.body),
				targetEvent: ev,
				clickOutsideToClose: false,
				fullscreen: true // Only for -xs, -sm breakpoints.
			});
		};

		$rootScope.relatorio = relatorio;
		$scope.visualizarRelatorio = function(ev) {
			$mdDialog.show({
				controller: function dialogController($scope, $rootScope, $mdDialog) {
					$scope.details = $rootScope.relatorio;
					$scope.hide = function() {
						$mdDialog.hide();
					};
					$scope.cancel = function() {
						$mdDialog.cancel();
					};
				},
				templateUrl: 'admin/views/relatorios.html',
				parent: angular.element(document.body),
				targetEvent: ev,
				clickOutsideToClose: false,
				fullscreen: true // Only for -xs, -sm breakpoints.
			});
		};


		totalQtd.countEscolas.splice(0,1);
		aprovadosQtd.countEscolas.splice(0,1);
		canceladosQtd.countEscolas.splice(0,1);
		$rootScope.qtd = totalQtd;
		$rootScope.qtdA = aprovadosQtd;
		$rootScope.qtdC = canceladosQtd;
		$scope.visualizarQtd = function(ev, quantidade) {
			$mdDialog.show({
				controller: function dialogController($scope, $rootScope, $mdDialog) {
					$scope.details = quantidade;
					$scope.hide = function() {
						$mdDialog.hide();
					};
					$scope.cancel = function() {
						$mdDialog.cancel();
					};
				},
				templateUrl: 'admin/views/qtd.html',
				parent: angular.element(document.body),
				targetEvent: ev,
				clickOutsideToClose: false,
				fullscreen: true // Only for -xs, -sm breakpoints.
			});
		}

		$scope.resetarVariaveis = function(){
			totalQtd = ({
				nome: "Geral",
				countTotal: 0,
				countHospedagem: 0,
				countFundamentalI: 0,
				countFundamentalII: 0,
				countEnsinoMedio: 0,
				countCamisetasP: 0,
				countCamisetasM: 0,
				countCamisetasG: 0,
				countEscolas:[{
					nome: "",
					num: 0
				}],
				countEixo: [{},{},{},{},{},{},{},{},{},{},{},{},{},{},{}]			
			});
		   	aprovadosQtd = ({
				nome: "Aprovados",
				countTotal: 0,
				countHospedagem: 0,
				countFundamentalI: 0,
				countFundamentalII: 0,
				countEnsinoMedio: 0,
				countCamisetasP: 0,
				countCamisetasM: 0,
				countCamisetasG: 0,
				countEscolas:[{
					nome: "",
					num: 0
				}],
				countEixo: [{},{},{},{},{},{},{},{},{},{},{},{},{},{},{}]			
			});
			let canceladosQtd = ({
				nome: "Cancelados/Pendentes",
				countTotal: 0,
				countHospedagem: 0,
				countFundamentalI: 0,
				countFundamentalII: 0,
				countEnsinoMedio: 0,
				countCamisetasP: 0,
				countCamisetasM: 0,
				countCamisetasG: 0,
				countEscolas:[{
					nome: "",
					num: 0
				}],
				countEixo: [{},{},{},{},{},{},{},{},{},{},{},{},{},{},{}]			
			});
			for(var x = 0; x<eixo.length;x++){
				totalQtd.countEixo[x].nome = eixo[x].nome;
				totalQtd.countEixo[x].num = eixo[x].num;
				totalQtd.countEixo[x].categoria = eixo[x].categoria;

				aprovadosQtd.countEixo[x].nome = eixo[x].nome;
				aprovadosQtd.countEixo[x].num = eixo[x].num;
				aprovadosQtd.countEixo[x].categoria = eixo[x].categoria;

				canceladosQtd.countEixo[x].nome = eixo[x].nome;
				canceladosQtd.countEixo[x].num = eixo[x].num;
				canceladosQtd.countEixo[x].categoria = eixo[x].categoria;
			}
			
		}

		$scope.setarProjetos();
		$scope.carregarProjetos("2018");
		$scope.carregarSaberes();
		$scope.carregarAvaliadores();
	});
})();
