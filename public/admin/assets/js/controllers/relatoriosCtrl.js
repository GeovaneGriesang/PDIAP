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
	.controller('relatoriosCtrl', function($scope, $rootScope, $mdToast, adminAPI) {

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

		var CATEGORIAS = ['Fundamental I (1º ao 5º anos)', 'Fundamental II (6º ao 9º anos)', 'Ensino Médio, Técnico e Superior'];

		// Contador de camiseta por tamanho: além do total, guarda o cruzamento com
		// categoria E tipo (aluno/orientador) ao mesmo tempo pro detalhamento da tela -
		// não basta saber "quantas são de Fundamental I" e "quantas são de aluno(a)"
		// separadamente, precisa dar pra responder "quantas são de Fundamental I E de
		// aluno(a)" junto.
		function novoContadorCamiseta() {
			var porCategoria = {};
			CATEGORIAS.forEach(function(c) { porCategoria[c] = { total: 0, aluno: 0, orientador: 0 }; });
			return { total: 0, porCategoria: porCategoria, aluno: 0, orientador: 0 };
		}

		function novaAgregacao(nome) {
			return {
				nome: nome,
				countTotal: 0,
				countHospedagem: 0,
				countFundamentalI: 0,
				countFundamentalII: 0,
				countEnsinoMedio: 0,
				camisetas: { P: novoContadorCamiseta(), M: novoContadorCamiseta(), G: novoContadorCamiseta() },
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
				var c = agregado.camisetas[integrante.tamCamiseta];
				if (!c) return;
				c.total++;
				if (integrante.tipo === 'Aluno') c.aluno++;
				else if (integrante.tipo === 'Orientador') c.orientador++;
				if (proj.categoria && c.porCategoria.hasOwnProperty(proj.categoria)) {
					var pc = c.porCategoria[proj.categoria];
					pc.total++;
					if (integrante.tipo === 'Aluno') pc.aluno++;
					else if (integrante.tipo === 'Orientador') pc.orientador++;
				}
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

			// Detalhamento por categoria fica em ordem fixa (não por quantidade) - é um
			// relatório pra reler várias vezes, não um ranking; categoria pulando de
			// posição a cada recarregamento atrapalharia mais do que ajudaria.
			agregado.camisetasArray = ordenarComMax(['P', 'M', 'G'].map(function(tam) {
				var c = agregado.camisetas[tam];
				return {
					nome: tam,
					num: c.total,
					detalheCategoria: CATEGORIAS.map(function(cat) {
						var pc = c.porCategoria[cat];
						return { nome: cat, num: pc.total, aluno: pc.aluno, orientador: pc.orientador };
					}),
					aluno: c.aluno,
					orientador: c.orientador,
					expandido: false
				};
			}));

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

		// Copiar pra WhatsApp: monta texto usando a formatação própria do WhatsApp
		// (*negrito*, não HTML - colar texto rico não funciona lá) e joga na área de
		// transferência. Cada função monta só o texto do seu "quadro"; copiarTexto()
		// cuida só de copiar e avisar.
		function cabecalho(aba) {
			return '*MOVACI ' + $rootScope.ano + ' — ' + aba.nome + '*';
		}

		function textoResumo() {
			return '*Resumo geral*\n' +
				'Projetos no total: *' + $scope.abas[0].countTotal + '*\n' +
				'Aprovados: *' + $scope.relatorio.countAprovados + '*\n' +
				'Confirmados: *' + $scope.relatorio.countParticipaSim + '*\n' +
				'Cancelados: *' + $scope.relatorio.countParticipaNao + '*\n' +
				'Pendentes: *' + $scope.relatorio.countPendente + '*';
		}

		function textoTotalHospedagem(aba) {
			return '*Total e hospedagem — ' + aba.nome + '*\n' +
				'Total de projetos: *' + aba.countTotal + '*\n' +
				'Pessoas com hospedagem solicitada: *' + aba.countHospedagem + '*';
		}

		function textoCategorias(aba) {
			return '*Por categoria — ' + aba.nome + '*\n' +
				aba.categoriasArray.map(function(c) { return c.nome + ': *' + c.num + '*'; }).join('\n');
		}

		function textoEixosGrupo(grupo) {
			return '*Eixos - ' + grupo.categoria + '*\n' +
				grupo.eixos.map(function(e) { return e.nome + ': *' + e.num + '*'; }).join('\n');
		}

		function textoEixosTodos(aba) {
			return aba.eixosPorCategoria.map(textoEixosGrupo).join('\n\n');
		}

		function textoCamisetas(aba, expandido) {
			var linhas = aba.camisetasArray.map(function(cm) {
				var linha = 'Tamanho ' + cm.nome + ': *' + cm.num + '*';
				if (expandido) {
					linha += '\n' + cm.detalheCategoria.map(function(d) {
						return '  ' + d.nome + ': ' + d.num + ' (' + d.aluno + ' aluno(a), ' + d.orientador + ' orientador(a))';
					}).join('\n');
				}
				return linha;
			});
			return '*Camisetas — ' + aba.nome + '*\n' + linhas.join('\n');
		}

		function textoEscolas(aba) {
			return '*Escolas (' + aba.escolasArray.length + ') — ' + aba.nome + '*\n' +
				aba.escolasArray.map(function(e) { return e.nome + ': *' + e.num + '*'; }).join('\n');
		}

		function textoCompleto(aba, expandido, semEscolas) {
			var partes = [cabecalho(aba), textoResumo(), textoTotalHospedagem(aba), textoCategorias(aba), textoEixosTodos(aba), textoCamisetas(aba, expandido)];
			if (!semEscolas) {
				partes.push(textoEscolas(aba));
			}
			return partes.join('\n\n');
		}

		function toast(mensagem) {
			$mdToast.show($mdToast.simple().textContent(mensagem).position('top right').hideDelay(2500));
		}

		// document.execCommand('copy') é descontinuado, mas fica como reserva pra
		// navegador/contexto onde navigator.clipboard não está disponível (ex: sem
		// HTTPS) - sem isso, "copiar" simplesmente falha calado nesses casos.
		function copiarComFallback(texto) {
			var textarea = document.createElement('textarea');
			textarea.value = texto;
			textarea.style.position = 'fixed';
			textarea.style.opacity = '0';
			document.body.appendChild(textarea);
			textarea.focus();
			textarea.select();
			try {
				document.execCommand('copy');
				toast('Copiado! Cole no WhatsApp.');
			} catch (e) {
				toast('Não foi possível copiar.');
			}
			document.body.removeChild(textarea);
		}

		function copiarTexto(texto) {
			if (navigator.clipboard && navigator.clipboard.writeText) {
				navigator.clipboard.writeText(texto).then(function() {
					toast('Copiado! Cole no WhatsApp.');
				}).catch(function() {
					copiarComFallback(texto);
				});
			} else {
				copiarComFallback(texto);
			}
		}

		$scope.copiarResumo = function() {
			copiarTexto(textoResumo());
		};
		$scope.copiarTotalHospedagem = function(aba) {
			copiarTexto(cabecalho(aba) + '\n\n' + textoTotalHospedagem(aba));
		};
		$scope.copiarCategorias = function(aba) {
			copiarTexto(cabecalho(aba) + '\n\n' + textoCategorias(aba));
		};
		$scope.copiarEixosGrupo = function(aba, grupo) {
			copiarTexto(cabecalho(aba) + '\n\n' + textoEixosGrupo(grupo));
		};
		$scope.copiarCamisetas = function(aba) {
			copiarTexto(cabecalho(aba) + '\n\n' + textoCamisetas(aba, true));
		};
		$scope.copiarEscolas = function(aba) {
			copiarTexto(cabecalho(aba) + '\n\n' + textoEscolas(aba));
		};
		$scope.copiarTudo = function(aba, expandido) {
			copiarTexto(textoCompleto(aba, expandido, false));
		};
		$scope.copiarTudoSemEscolas = function(aba) {
			copiarTexto(textoCompleto(aba, true, true));
		};

		$scope.carregarRelatorios();
	});
})();
