(function(){
	'use strict';

	// Relatórios/quantidade de projetos - substitui os diálogos antigos do painel legado
	// (admin2Ctrl.js, guardado no disco só como referência histórica). Mesma agregação de
	// dados (a partir de adminAPI.getTodosProjetos, já usada por outros controllers do
	// /master), mas corrige um bug real do original: resetarVariaveis() reatribuía
	// canceladosQtd com "let" *dentro* da função, então a variável de fora nunca era
	// resetada de verdade entre recarregamentos. Aqui cada carregamento monta objetos
	// novos do zero, sem esse tipo de reatribuição escondida.
	angular
	.module('PDIAPa')
	.controller('relatoriosCtrl', function($scope, $rootScope, adminAPI) {

		var EIXOS = [
			{nome:"Ciências da Natureza e suas tecnologias", categoria: "Fundamental I (1º ao 5º anos)"},
			{nome:"Ciências Humanas e suas tecnologias", categoria: "Fundamental I (1º ao 5º anos)"},
			{nome:"Linguagens, Códigos e suas tecnologias", categoria: "Fundamental I (1º ao 5º anos)"},
			{nome:"Matemática e suas tecnologias", categoria: "Fundamental I (1º ao 5º anos)"},
			{nome:"Ciências da Natureza e suas tecnologias", categoria: "Fundamental II (6º ao 9º anos)"},
			{nome:"Ciências Humanas e suas tecnologias", categoria: "Fundamental II (6º ao 9º anos)"},
			{nome:"Linguagens, Códigos e suas tecnologias", categoria: "Fundamental II (6º ao 9º anos)"},
			{nome:"Matemática e suas tecnologias", categoria: "Fundamental II (6º ao 9º anos)"},
			{nome:"Ciências Agrárias, Exatas e da Terra", categoria: "Ensino Médio, Técnico e Superior"},
			{nome:"Ciências Ambientais, Biológicas e da Saúde", categoria: "Ensino Médio, Técnico e Superior"},
			{nome:"Ciências Humanas e Sociais Aplicadas", categoria: "Ensino Médio, Técnico e Superior"},
			{nome:"Línguas e Artes", categoria: "Ensino Médio, Técnico e Superior"},
			{nome:"Extensão", categoria: "Ensino Médio, Técnico e Superior"},
			{nome:"Ciências da Computação", categoria: "Ensino Médio, Técnico e Superior"},
			{nome:"Engenharias", categoria: "Ensino Médio, Técnico e Superior"}
		];

		function novaAgregacao(nome) {
			return {
				nome: nome,
				countTotal: 0,
				countHospedagem: 0,
				countFundamentalI: 0,
				countFundamentalII: 0,
				countEnsinoMedio: 0,
				countCamisetasP: 0,
				countCamisetasM: 0,
				countCamisetasG: 0,
				escolas: {},
				escolasArray: [],
				eixos: EIXOS.map(function(e) { return { nome: e.nome, categoria: e.categoria, num: 0 }; })
			};
		}

		// Conta quantas pessoas precisam de hospedagem (itens separados por vírgula no
		// campo livre "hospedagem" do projeto) - mesmo critério do original, sem o
		// teto artificial de 3 que o código antigo tinha (nada impede um projeto com
		// mais gente precisando de hospedagem).
		function contarHospedagem(hospedagem) {
			if (!hospedagem) return 0;
			return hospedagem.split(',').filter(function(s) { return s.trim() !== ''; }).length;
		}

		function acumular(agregado, proj) {
			agregado.countTotal++;
			agregado.countHospedagem += contarHospedagem(proj.hospedagem);

			if (proj.categoria === 'Fundamental I (1º ao 5º anos)') agregado.countFundamentalI++;
			else if (proj.categoria === 'Fundamental II (6º ao 9º anos)') agregado.countFundamentalII++;
			else if (proj.categoria === 'Ensino Médio, Técnico e Superior') agregado.countEnsinoMedio++;

			var chaveEscola = proj.nomeEscola || '(sem escola informada)';
			agregado.escolas[chaveEscola] = (agregado.escolas[chaveEscola] || 0) + 1;

			angular.forEach(proj.integrantes, function(integrante) {
				if (integrante.tamCamiseta === 'P') agregado.countCamisetasP++;
				else if (integrante.tamCamiseta === 'M') agregado.countCamisetasM++;
				else if (integrante.tamCamiseta === 'G') agregado.countCamisetasG++;
			});

			angular.forEach(agregado.eixos, function(e) {
				if (proj.eixo === e.nome && proj.categoria === e.categoria) e.num++;
			});
		}

		function escolasParaArray(escolasObj) {
			return Object.keys(escolasObj).map(function(nome) {
				return { nome: nome, num: escolasObj[nome] };
			}).sort(function(a, b) { return b.num - a.num; });
		}

		// Ordena por quantidade (maior primeiro) e anota cada item com o maior valor do
		// grupo - a view só precisa fazer item.num/item.max pra desenhar a barra, sem
		// calcular nada.
		function ordenarComMax(lista) {
			var ordenada = lista.slice().sort(function(a, b) { return b.num - a.num; });
			var max = ordenada.length ? ordenada[0].num : 0;
			ordenada.forEach(function(item) { item.max = max || 1; });
			return ordenada;
		}

		// Prepara as estruturas prontas pra tela: categorias, eixos agrupados por
		// categoria, e camisetas - cada uma já ordenada e com o "max" do grupo anotado.
		function finalizarAgregacao(agregado) {
			agregado.escolasArray = escolasParaArray(agregado.escolas);

			agregado.categoriasArray = ordenarComMax([
				{ nome: 'Fundamental I (1º ao 5º anos)', num: agregado.countFundamentalI },
				{ nome: 'Fundamental II (6º ao 9º anos)', num: agregado.countFundamentalII },
				{ nome: 'Ensino Médio, Técnico e Superior', num: agregado.countEnsinoMedio }
			]);

			agregado.camisetasArray = ordenarComMax([
				{ nome: 'P', num: agregado.countCamisetasP },
				{ nome: 'M', num: agregado.countCamisetasM },
				{ nome: 'G', num: agregado.countCamisetasG }
			]);

			var porCategoria = {};
			agregado.eixos.forEach(function(e) {
				if (!porCategoria[e.categoria]) porCategoria[e.categoria] = [];
				porCategoria[e.categoria].push({ nome: e.nome, num: e.num });
			});
			agregado.eixosPorCategoria = Object.keys(porCategoria).map(function(categoria) {
				return { categoria: categoria, eixos: ordenarComMax(porCategoria[categoria]) };
			});
		}

		$scope.year = CadastraAno();
		$rootScope.ano = $rootScope.ano || new Date().getFullYear();

		$scope.carregarRelatorios = function() {
			var relatorio = { countAprovados: 0, countParticipaSim: 0, countParticipaNao: 0, countPendente: 0 };
			var qtdGeral = novaAgregacao('Geral');
			var qtdAprovados = novaAgregacao('Aprovados');
			var qtdCancelados = novaAgregacao('Cancelados e Pendentes');

			adminAPI.getTodosProjetos($rootScope.ano)
			.success(function(projetos) {
				angular.forEach(projetos, function(proj) {
					var ano = new Date(proj.createdAt).getFullYear();
					if (ano !== $rootScope.ano) return;

					var aprovado = proj.aprovado === true;
					var cancelado = aprovado && proj.participa !== true;

					if (aprovado) {
						relatorio.countAprovados++;
						if (proj.participa === true) relatorio.countParticipaSim++;
						else if (proj.participa === false) relatorio.countParticipaNao++;
						else relatorio.countPendente++;
					}

					acumular(qtdGeral, proj);
					if (aprovado) acumular(qtdAprovados, proj);
					if (cancelado) acumular(qtdCancelados, proj);
				});

				finalizarAgregacao(qtdGeral);
				finalizarAgregacao(qtdAprovados);
				finalizarAgregacao(qtdCancelados);

				$scope.relatorio = relatorio;
				$scope.abas = [qtdGeral, qtdAprovados, qtdCancelados];
			})
			.error(function(status) {
				console.log('Erro ao carregar relatórios: ' + status);
			});
		};

		$scope.recarregar = function() {
			$scope.carregarRelatorios();
		};

		$scope.imprimir = function() {
			window.print();
		};

		$scope.carregarRelatorios();
	});
})();
