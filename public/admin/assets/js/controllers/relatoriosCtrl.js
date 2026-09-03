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

		var NACIONALIDADE_LABELS = { brasileiro: 'Brasil', paraguaio: 'Paraguai', uruguaio: 'Uruguai', venezuelano: 'Venezuela' };

		// Frases oficiais da lista de trabalhos aprovados (ver models/projeto-schema.js,
		// campo tipoAprovacao).
		var SITUACAO_LABELS = {
			anais: 'Aprovado para apresentação e publicação nos anais',
			apresentacao: 'Aprovado somente para apresentação no evento'
		};
		function rotuloSituacao(proj) {
			if (proj.aprovado !== true) return proj.aprovado === false ? 'Não aprovado' : 'Não avaliado';
			return SITUACAO_LABELS[proj.tipoAprovacao] || 'Aprovado';
		}
		$scope.rotuloSituacao = rotuloSituacao;

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
				eixos: EIXOS.map(function(e) { return { nome: e.nome, categoria: e.categoria, num: 0 }; }),
				projetos: [],
				alunos: {},
				orientadores: {},
				cidades: {},
				estados: {},
				nacionalidades: {}
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

		// Chave pra reconhecer a MESMA pessoa repetida em mais de um projeto: usa o
		// documento (limpo de pontuação) quando preenchido - é o dado mais confiável
		// disponível. O campo não é obrigatório no cadastro, então sem documento cai pro
		// nome normalizado (minúsculas, sem espaço nas pontas) + escola - exige as DUAS
		// coisas baterem, não só o nome. Sem a escola, dois estudantes homônimos de
		// escolas diferentes (comum com nomes populares) caíam juntos como se fossem a
		// mesma pessoa "inscrita em vários projetos", quando na verdade eram pessoas
		// diferentes - a escola em comum é um sinal bem mais forte de que é a mesma
		// pessoa mesmo sem documento.
		function chavePessoa(integrante, proj) {
			var doc = (integrante.cpf || '').replace(/\D/g, '');
			if (doc) return 'doc:' + doc;
			var nome = (integrante.nome || '').trim().toLowerCase();
			if (!nome) return null;
			var escola = (proj.nomeEscola || '').trim().toLowerCase();
			return 'nome:' + nome + '|escola:' + escola;
		}

		function registrarPessoa(mapa, integrante, proj) {
			var chave = chavePessoa(integrante, proj);
			if (!chave) return;
			if (!mapa[chave]) {
				// categoria vem do primeiro projeto em que a pessoa aparece - na prática
				// é sempre a mesma (ninguém tem projeto de Fundamental E de Médio ao
				// mesmo tempo), então não precisa reconciliar entre projetos.
				mapa[chave] = { nome: integrante.nome || '(sem nome)', nomeEscola: proj.nomeEscola || '', categoria: proj.categoria || '', projetos: [] };
			}
			mapa[chave].projetos.push({ numInscricao: proj.numInscricao, nomeProjeto: proj.nomeProjeto, nomeEscola: proj.nomeEscola });
		}

		// Soma aluno/orientador numa entrada de mapa genérica (cidades, estados,
		// nacionalidades), criando a entrada com os campos de "base" na primeira vez.
		function contarPorTipo(mapa, chave, base, tipo) {
			if (!mapa[chave]) {
				mapa[chave] = angular.extend({ aluno: 0, orientador: 0 }, base);
			}
			if (tipo === 'Aluno') mapa[chave].aluno++;
			else if (tipo === 'Orientador') mapa[chave].orientador++;
		}

		function acumular(agregado, proj) {
			agregado.countTotal++;
			agregado.countHospedagem += contarHospedagem(proj.hospedagem);

			if (proj.categoria === 'Fundamental I (1º ao 5º anos)') agregado.countFundamentalI++;
			else if (proj.categoria === 'Fundamental II (6º ao 9º anos)') agregado.countFundamentalII++;
			else if (proj.categoria === 'Ensino Médio, Técnico e Superior') agregado.countEnsinoMedio++;

			var chaveEscola = proj.nomeEscola || '(sem escola informada)';
			agregado.escolas[chaveEscola] = (agregado.escolas[chaveEscola] || 0) + 1;

			var cidade = proj.cidade || '(sem cidade)';
			var estado = proj.estado || '(sem estado)';

			angular.forEach(proj.integrantes, function(integrante) {
				var c = agregado.camisetas[integrante.tamCamiseta];
				if (c) {
					c.total++;
					if (integrante.tipo === 'Aluno') c.aluno++;
					else if (integrante.tipo === 'Orientador') c.orientador++;
					if (proj.categoria && c.porCategoria.hasOwnProperty(proj.categoria)) {
						var pc = c.porCategoria[proj.categoria];
						pc.total++;
						if (integrante.tipo === 'Aluno') pc.aluno++;
						else if (integrante.tipo === 'Orientador') pc.orientador++;
					}
				}

				if (integrante.tipo === 'Aluno') {
					registrarPessoa(agregado.alunos, integrante, proj);
				} else if (integrante.tipo === 'Orientador') {
					registrarPessoa(agregado.orientadores, integrante, proj);
				}

				contarPorTipo(agregado.cidades, cidade + '|' + estado, { cidade: cidade, estado: estado }, integrante.tipo);
				contarPorTipo(agregado.estados, estado, { estado: estado }, integrante.tipo);
				contarPorTipo(agregado.nacionalidades, integrante.nacionalidade || '(não informada)', { nacionalidade: integrante.nacionalidade || '(não informada)' }, integrante.tipo);
			});

			angular.forEach(agregado.eixos, function(e) {
				if (proj.eixo === e.nome && proj.categoria === e.categoria) e.num++;
			});

			agregado.projetos.push({
				nomeProjeto: proj.nomeProjeto,
				numInscricao: proj.numInscricao,
				nomeEscola: proj.nomeEscola,
				categoria: proj.categoria,
				eixo: proj.eixo,
				aprovado: proj.aprovado,
				tipoAprovacao: proj.tipoAprovacao,
				modalidade: proj.modalidade,
				alunos: (proj.integrantes || []).filter(function(i) { return i.tipo === 'Aluno'; }).map(function(i) { return i.nome; }),
				orientadores: (proj.integrantes || []).filter(function(i) { return i.tipo === 'Orientador'; }).map(function(i) { return i.nome; })
			});
		}

		// Desempate por nome quando a quantidade é igual - sem isso a ordem de
		// empate ficava arbitrária (ordem de inserção no objeto), mudando toda
		// hora sem motivo entre recarregamentos.
		function porQuantidadeDepoisNome(campoNum, campoNome) {
			return function(a, b) {
				if (b[campoNum] !== a[campoNum]) return b[campoNum] - a[campoNum];
				return (a[campoNome] || '').localeCompare(b[campoNome] || '', 'pt-BR');
			};
		}

		function somarCampo(lista, campo) {
			return lista.reduce(function(soma, item) { return soma + (item[campo] || 0); }, 0);
		}

		// Estudantes por categoria (Fundamental I, Fundamental II, Ensino Médio/Técnico/
		// Superior) - mesma ordem fixa de CATEGORIAS usada em "Por categoria", cada
		// grupo já ordenado por nome (é uma lista pra procurar gente, não um ranking).
		function alunosPorCategoria(alunosArray) {
			var porCategoria = {};
			CATEGORIAS.forEach(function(cat) { porCategoria[cat] = []; });
			alunosArray.forEach(function(aluno) {
				if (porCategoria[aluno.categoria]) porCategoria[aluno.categoria].push(aluno);
				else (porCategoria['(sem categoria)'] = porCategoria['(sem categoria)'] || []).push(aluno);
			});
			var ordem = CATEGORIAS.concat(porCategoria['(sem categoria)'] ? ['(sem categoria)'] : []);
			return ordem.map(function(cat) {
				return { categoria: cat, alunos: porCategoria[cat], total: porCategoria[cat].length };
			});
		}

		// Projetos agrupados por categoria -> eixo (mesma ordem fixa de CATEGORIAS/EIXOS
		// usada em "Por categoria"/"Por eixo temático" já existentes) - usado na aba
		// Aprovados pra listar quais projetos exatamente compõem cada barra de
		// eixosPorCategoria, não só a contagem.
		function projetosPorCategoriaEixo(projetosArray) {
			var porCategoria = {};
			CATEGORIAS.forEach(function(cat) { porCategoria[cat] = {}; });
			projetosArray.forEach(function(proj) {
				var cat = porCategoria[proj.categoria] ? proj.categoria : '(sem categoria)';
				if (!porCategoria[cat]) porCategoria[cat] = {};
				var eixo = proj.eixo || '(sem eixo)';
				if (!porCategoria[cat][eixo]) porCategoria[cat][eixo] = [];
				porCategoria[cat][eixo].push(proj);
			});
			var ordem = CATEGORIAS.concat(porCategoria['(sem categoria)'] ? ['(sem categoria)'] : []);
			return ordem.filter(function(cat) { return porCategoria[cat]; }).map(function(cat) {
				var eixosDaCategoria = EIXOS.filter(function(e) { return e.categoria === cat; }).map(function(e) { return e.nome; });
				var eixosExtras = Object.keys(porCategoria[cat]).filter(function(nome) { return eixosDaCategoria.indexOf(nome) === -1; });
				var eixos = eixosDaCategoria.concat(eixosExtras).filter(function(nome) { return porCategoria[cat][nome]; }).map(function(nome) {
					return { eixo: nome, projetos: porCategoria[cat][nome], total: porCategoria[cat][nome].length };
				});
				return { categoria: cat, eixos: eixos, total: somarCampo(eixos, 'total') };
			});
		}

		function escolasParaArray(escolasObj) {
			return Object.keys(escolasObj).map(function(nome) {
				return { nome: nome, num: escolasObj[nome] };
			}).sort(porQuantidadeDepoisNome('num', 'nome'));
		}

		// Lista de pessoas (alunos/orientadores) únicas, ordenada por nome - cada uma já
		// com o total de projetos que participa e o array completo deles (a view só
		// precisa mostrar esse array quando numProjetos > 1).
		function pessoasParaArray(mapa) {
			return Object.keys(mapa).map(function(chave) {
				var p = mapa[chave];
				p.numProjetos = p.projetos.length;
				p.expandido = false;
				return p;
			}).sort(function(a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); });
		}

		// Cidades/estados/nacionalidades - ordenados por total (aluno+orientador) igual
		// já é feito com escolas.
		function localizacaoParaArray(mapa) {
			return Object.keys(mapa).map(function(chave) {
				var item = mapa[chave];
				item.total = item.aluno + item.orientador;
				return item;
			}).sort(function(a, b) {
				if (b.total !== a.total) return b.total - a.total;
				var nomeA = a.cidade || a.estado || a.nacionalidade || '';
				var nomeB = b.cidade || b.estado || b.nacionalidade || '';
				return nomeA.localeCompare(nomeB, 'pt-BR');
			});
		}

		// Paleta categórica (ordem fixa, não gerada) - até 6 fatias de verdade; a partir
		// da 7ª cidade tudo vira "Outras" num cinza neutro (nunca uma 7ª cor gerada -
		// gráfico de pizza com muitas fatias fica ilegível e as cores próximas se
		// confundem, então uma tabela cobre o resto: a tabela "Por cidade" já mostra
		// todo mundo, a pizza é só um resumo visual das principais).
		var CORES_PIZZA = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300'];
		var COR_OUTRAS = '#c3c2b7';
		var PIZZA_MAX_FATIAS = CORES_PIZZA.length;

		// Converte um ângulo (graus, 0 = topo, sentido horário) num ponto na
		// circunferência de raio R centrada em (cx,cy) - usado pra montar o "d" de cada
		// fatia do SVG.
		function pontoNoCirculo(anguloGraus, cx, cy, raio) {
			var rad = (anguloGraus - 90) * Math.PI / 180;
			return { x: cx + raio * Math.cos(rad), y: cy + raio * Math.sin(rad) };
		}

		function arcoSvg(anguloInicial, anguloFinal, cx, cy, raio) {
			// Fatia única (100%) não fecha com um só comando "A" - desenha em duas
			// metades de 180° pra formar o círculo completo.
			if (anguloFinal - anguloInicial >= 359.99) {
				var topo = pontoNoCirculo(0, cx, cy, raio);
				var baixo = pontoNoCirculo(180, cx, cy, raio);
				return 'M ' + topo.x + ',' + topo.y +
					' A ' + raio + ',' + raio + ' 0 1 1 ' + baixo.x + ',' + baixo.y +
					' A ' + raio + ',' + raio + ' 0 1 1 ' + topo.x + ',' + topo.y + ' Z';
			}
			var p1 = pontoNoCirculo(anguloInicial, cx, cy, raio);
			var p2 = pontoNoCirculo(anguloFinal, cx, cy, raio);
			var arcoGrande = (anguloFinal - anguloInicial) > 180 ? 1 : 0;
			return 'M ' + cx + ',' + cy + ' L ' + p1.x + ',' + p1.y +
				' A ' + raio + ',' + raio + ' 0 ' + arcoGrande + ' 1 ' + p2.x + ',' + p2.y + ' Z';
		}

		// Monta as fatias (path SVG já pronto, cor, % ) a partir do array de cidades já
		// ordenado por total - top N cidades + "Outras" agrupando o resto.
		function construirPizzaCidades(cidadesArray) {
			var principais = cidadesArray.slice(0, PIZZA_MAX_FATIAS);
			var resto = cidadesArray.slice(PIZZA_MAX_FATIAS);
			var totalResto = resto.reduce(function(soma, c) { return soma + c.total; }, 0);

			var fatias = principais.map(function(c, i) {
				return { nome: c.cidade, valor: c.total, cor: CORES_PIZZA[i] };
			});
			if (totalResto > 0) {
				fatias.push({ nome: 'Outras (' + resto.length + ' cidades)', valor: totalResto, cor: COR_OUTRAS });
			}

			var totalGeral = fatias.reduce(function(soma, f) { return soma + f.valor; }, 0);
			var anguloAcumulado = 0;
			fatias.forEach(function(f) {
				var fracao = totalGeral > 0 ? f.valor / totalGeral : 0;
				var anguloFinal = anguloAcumulado + fracao * 360;
				f.percentual = Math.round(fracao * 1000) / 10;
				f.pathD = arcoSvg(anguloAcumulado, anguloFinal, 100, 100, 90);
				anguloAcumulado = anguloFinal;
			});

			return { fatias: fatias, total: totalGeral };
		}

		// Ordena por quantidade (maior primeiro) e anota cada item com o maior valor do
		// grupo - a view só precisa fazer item.num/item.max pra desenhar a barra, sem
		// calcular nada.
		function ordenarComMax(lista) {
			var ordenada = lista.slice().sort(porQuantidadeDepoisNome('num', 'nome'));
			var max = ordenada.length ? ordenada[0].num : 0;
			ordenada.forEach(function(item) { item.max = max || 1; });
			return ordenada;
		}

		// Prepara as estruturas prontas pra tela: categorias, eixos agrupados por
		// categoria, e camisetas - cada uma já ordenada e com o "max" do grupo anotado.
		function finalizarAgregacao(agregado) {
			agregado.escolasArray = escolasParaArray(agregado.escolas);
			agregado.escolasTotal = somarCampo(agregado.escolasArray, 'num');

			agregado.categoriasArray = ordenarComMax([
				{ nome: 'Fundamental I (1º ao 5º anos)', num: agregado.countFundamentalI },
				{ nome: 'Fundamental II (6º ao 9º anos)', num: agregado.countFundamentalII },
				{ nome: 'Ensino Médio, Técnico e Superior', num: agregado.countEnsinoMedio }
			]);
			agregado.categoriasTotal = somarCampo(agregado.categoriasArray, 'num');

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
			agregado.camisetasTotal = somarCampo(agregado.camisetasArray, 'num');

			var porCategoria = {};
			agregado.eixos.forEach(function(e) {
				if (!porCategoria[e.categoria]) porCategoria[e.categoria] = [];
				porCategoria[e.categoria].push({ nome: e.nome, num: e.num });
			});
			agregado.eixosPorCategoria = Object.keys(porCategoria).map(function(categoria) {
				var eixos = ordenarComMax(porCategoria[categoria]);
				return { categoria: categoria, eixos: eixos, total: somarCampo(eixos, 'num') };
			});

			agregado.alunosArray = pessoasParaArray(agregado.alunos);
			agregado.alunosPorCategoria = alunosPorCategoria(agregado.alunosArray);
			agregado.orientadoresArray = pessoasParaArray(agregado.orientadores);

			agregado.projetosPorCategoriaEixo = projetosPorCategoriaEixo(agregado.projetos);

			agregado.cidadesArray = localizacaoParaArray(agregado.cidades);
			agregado.pizzaCidades = construirPizzaCidades(agregado.cidadesArray);
			agregado.estadosArray = localizacaoParaArray(agregado.estados);
			agregado.nacionalidadesArray = localizacaoParaArray(agregado.nacionalidades).map(function(item) {
				item.nome = NACIONALIDADE_LABELS[item.nacionalidade] || item.nacionalidade;
				return item;
			});
			agregado.cidadesTotal = { aluno: somarCampo(agregado.cidadesArray, 'aluno'), orientador: somarCampo(agregado.cidadesArray, 'orientador'), total: somarCampo(agregado.cidadesArray, 'total') };
			agregado.estadosTotal = { aluno: somarCampo(agregado.estadosArray, 'aluno'), orientador: somarCampo(agregado.estadosArray, 'orientador'), total: somarCampo(agregado.estadosArray, 'total') };
			agregado.nacionalidadesTotal = { aluno: somarCampo(agregado.nacionalidadesArray, 'aluno'), orientador: somarCampo(agregado.nacionalidadesArray, 'orientador'), total: somarCampo(agregado.nacionalidadesArray, 'total') };

			// Quadros grandes (podem ter centenas de linhas) começam fechados - só o
			// título e o total ficam visíveis até a pessoa clicar pra abrir, mesmo
			// padrão +/- já usado em Camisetas.
			agregado.escolasExpandido = false;
			agregado.alunosExpandido = false;
			agregado.orientadoresExpandido = false;
			agregado.localizacaoExpandido = false;
		}

		$scope.year = CadastraAno();
		$rootScope.ano = $rootScope.ano || new Date().getFullYear();

		$scope.carregarRelatorios = function() {
			var relatorio = { countAprovados: 0, countParticipaSim: 0, countParticipaNao: 0, countPendente: 0 };
			var qtdGeral = novaAgregacao('Geral');
			var qtdAprovados = novaAgregacao('Aprovados');
			// "Reprovado" só é distinguível de "ainda não avaliado" pra reprovações feitas
			// depois do fix em routes/admin.js#PUT /upgreice (antes gravava $unset, igual a
			// nunca avaliado - reprovações antigas continuam indistinguíveis de pendentes).
			var qtdNaoReprovados = novaAgregacao('Não reprovados');
			var qtdCancelados = novaAgregacao('Cancelados e Pendentes');

			adminAPI.getTodosProjetos($rootScope.ano)
			.success(function(projetos) {
				angular.forEach(projetos, function(proj) {
					var ano = new Date(proj.createdAt).getFullYear();
					if (ano !== $rootScope.ano) return;

					var aprovado = proj.aprovado === true;
					var naoReprovado = proj.aprovado !== false;
					var cancelado = aprovado && proj.participa !== true;

					if (aprovado) {
						relatorio.countAprovados++;
						if (proj.participa === true) relatorio.countParticipaSim++;
						else if (proj.participa === false) relatorio.countParticipaNao++;
						else relatorio.countPendente++;
					}

					acumular(qtdGeral, proj);
					if (aprovado) acumular(qtdAprovados, proj);
					if (naoReprovado) acumular(qtdNaoReprovados, proj);
					if (cancelado) acumular(qtdCancelados, proj);
				});

				finalizarAgregacao(qtdGeral);
				finalizarAgregacao(qtdAprovados);
				finalizarAgregacao(qtdNaoReprovados);
				finalizarAgregacao(qtdCancelados);

				$scope.relatorio = relatorio;
				$scope.abas = [qtdGeral, qtdAprovados, qtdNaoReprovados, qtdCancelados];
			})
			.error(function(status) {
				console.log('Erro ao carregar relatórios: ' + status);
			});
		};

		$scope.recarregar = function() {
			$scope.carregarRelatorios();
		};

		// Filtro de categoria/eixo pra "Projetos - Alunos e Orientadores" - opcional
		// (checkbox), não afeta as outras seções do relatório. Usa as mesmas
		// CATEGORIAS/EIXOS fixas já usadas no resto do arquivo, não uma lista por edição -
		// esse relatório olha anos passados também, onde só essa lista fixa fez sentido.
		$scope.CATEGORIAS = CATEGORIAS;
		$scope.filtrarPorCategoriaEixo = false;
		$scope.filtroCategoria = null;
		$scope.filtroEixo = null;
		$scope.eixosDoFiltro = [];
		$scope.selectEixosFiltro = function(categoria) {
			$scope.filtroEixo = null;
			$scope.eixosDoFiltro = EIXOS.filter(function(e) { return e.categoria === categoria; }).map(function(e) { return e.nome; });
		};
		$scope.filtroProjeto = function(p) {
			if (!$scope.filtrarPorCategoriaEixo) return true;
			if ($scope.filtroCategoria && p.categoria !== $scope.filtroCategoria) return false;
			if ($scope.filtroEixo && p.eixo !== $scope.filtroEixo) return false;
			return true;
		};

		function csvEscape(valor) {
			var texto = (valor === undefined || valor === null) ? '' : String(valor);
			if (/["\n;]/.test(texto)) {
				texto = '"' + texto.replace(/"/g, '""') + '"';
			}
			return texto;
		}

		// Planilha (CSV com ";" - Excel em pt-BR só separa coluna certo assim, já que ","
		// é separador decimal; o BOM na frente faz o Excel reconhecer o UTF-8 e não
		// estropiar os acentos). Toda seção do relatório baixa a sua por aqui.
		function baixarCsv(nomeBase, cabecalhos, linhas) {
			var csv = [cabecalhos.map(csvEscape).join(';')];
			linhas.forEach(function(linha) { csv.push(linha.map(csvEscape).join(';')); });
			var blob = new Blob(['﻿' + csv.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
			var url = URL.createObjectURL(blob);
			var a = document.createElement('a');
			a.href = url;
			a.download = nomeBase.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.csv';
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		}

		// Sufixo comum dos nomes de arquivo: identifica a aba (Geral/Aprovados/...) e o ano.
		function sufixo(aba) {
			return '-' + aba.nome + '-' + $rootScope.ano;
		}

		$scope.exportarPlanilhaProjetos = function(aba) {
			baixarCsv('projetos' + sufixo(aba),
				['Nº Inscrição', 'Projeto', 'Categoria', 'Eixo', 'Situação', 'Modalidade', 'Escola', 'Aluno(s)', 'Orientador(es)'],
				aba.projetos.filter($scope.filtroProjeto).map(function(p) {
					return [p.numInscricao, p.nomeProjeto, p.categoria, p.eixo, rotuloSituacao(p), p.modalidade, p.nomeEscola, p.alunos.join(', '), p.orientadores.join(', ')];
				}));
		};

		$scope.csvResumo = function(aba) {
			baixarCsv('resumo-geral-' + $rootScope.ano, ['Indicador', 'Quantidade'], [
				['Projetos no total', $scope.abas[0].countTotal],
				['Aprovados', $scope.relatorio.countAprovados],
				['Confirmados', $scope.relatorio.countParticipaSim],
				['Cancelados', $scope.relatorio.countParticipaNao],
				['Aprovados sem confirmar', $scope.relatorio.countPendente]
			]);
		};

		$scope.csvTotalHospedagem = function(aba) {
			baixarCsv('hospedagem' + sufixo(aba), ['Indicador', 'Quantidade'], [
				['Projetos', aba.countTotal],
				['Pessoas com hospedagem solicitada', aba.countHospedagem]
			]);
		};

		$scope.csvCategorias = function(aba) {
			baixarCsv('por-categoria' + sufixo(aba), ['Categoria', 'Projetos'],
				aba.categoriasArray.map(function(c) { return [c.nome, c.num]; }));
		};

		$scope.csvEixosGrupo = function(aba, grupo) {
			baixarCsv('eixos-' + grupo.categoria + sufixo(aba), ['Eixo', 'Projetos'],
				grupo.eixos.map(function(e) { return [e.nome, e.num]; }));
		};

		$scope.csvCamisetas = function(aba) {
			var linhas = [];
			aba.camisetasArray.forEach(function(cm) {
				linhas.push(['Tamanho ' + cm.nome, '(todas)', cm.num, cm.aluno, cm.orientador]);
				cm.detalheCategoria.forEach(function(d) {
					linhas.push(['Tamanho ' + cm.nome, d.nome, d.num, d.aluno, d.orientador]);
				});
			});
			baixarCsv('camisetas' + sufixo(aba), ['Tamanho', 'Categoria', 'Total', 'Aluno(a)', 'Orientador(a)'], linhas);
		};

		$scope.csvEscolas = function(aba) {
			baixarCsv('escolas' + sufixo(aba), ['Escola', 'Projetos'],
				aba.escolasArray.map(function(e) { return [e.nome, e.num]; }));
		};

		// Uma linha por pessoa; quem está em mais de um projeto vem com todos listados
		// numa coluna só, pra não repetir a pessoa em várias linhas.
		function linhasPessoas(lista) {
			return lista.map(function(p) {
				return [p.nome, p.nomeEscola, p.categoria, p.numProjetos,
					(p.projetos || []).map(function(proj) { return 'Nº ' + proj.numInscricao + ' ' + proj.nomeProjeto; }).join(' | ')];
			});
		}

		$scope.csvAlunos = function(aba) {
			baixarCsv('estudantes' + sufixo(aba), ['Nome', 'Escola', 'Categoria', 'Nº de projetos', 'Projetos'], linhasPessoas(aba.alunosArray));
		};

		$scope.csvOrientadores = function(aba) {
			baixarCsv('orientadores' + sufixo(aba), ['Nome', 'Escola', 'Categoria', 'Nº de projetos', 'Projetos'], linhasPessoas(aba.orientadoresArray));
		};

		$scope.csvProjetosPorCategoriaEixo = function(aba) {
			var linhas = [];
			aba.projetosPorCategoriaEixo.forEach(function(grupo) {
				grupo.eixos.forEach(function(ge) {
					ge.projetos.forEach(function(p) {
						linhas.push([grupo.categoria, ge.eixo, p.numInscricao, p.nomeProjeto, p.nomeEscola]);
					});
				});
			});
			baixarCsv('projetos-por-categoria-eixo' + sufixo(aba), ['Categoria', 'Eixo', 'Nº Inscrição', 'Projeto', 'Escola'], linhas);
		};

		$scope.csvLocalizacao = function(aba) {
			var linhas = [];
			aba.cidadesArray.forEach(function(c) { linhas.push(['Cidade', c.cidade + '/' + c.estado, c.aluno, c.orientador, c.total]); });
			aba.estadosArray.forEach(function(e) { linhas.push(['Estado', e.estado, e.aluno, e.orientador, e.total]); });
			aba.nacionalidadesArray.forEach(function(n) { linhas.push(['País', n.nome, n.aluno, n.orientador, n.total]); });
			baixarCsv('localizacao' + sufixo(aba), ['Tipo', 'Local', 'Aluno(a)', 'Orientador(a)', 'Total'], linhas);
		};

		$scope.imprimir = function() {
			window.print();
		};

		// $scope.voltarAoTopo vem do adminCtrl (escopo pai) - mesmo botão fixo em
		// todas as telas do admin, não só aqui.

		// Copiar pra WhatsApp: monta texto usando a formatação própria do WhatsApp
		// (*negrito*, não HTML - colar texto rico não funciona lá) e joga na área de
		// transferência. Cada função monta só o texto do seu "quadro"; copiarTexto()
		// cuida só de copiar e avisar.
		function cabecalho(aba) {
			return '*MOVACI ' + $rootScope.ano + ' — ' + aba.nome + '*';
		}

		function textoResumo() {
			return '*Resumo geral*\n' +
				'- Projetos no total: *' + $scope.abas[0].countTotal + '*\n' +
				'- Aprovados: *' + $scope.relatorio.countAprovados + '*\n' +
				'- Confirmados: *' + $scope.relatorio.countParticipaSim + '*\n' +
				'- Cancelados: *' + $scope.relatorio.countParticipaNao + '*\n' +
				'- Pendentes: *' + $scope.relatorio.countPendente + '*';
		}

		function textoTotalHospedagem(aba) {
			return '*Total e hospedagem — ' + aba.nome + '*\n' +
				'- Total de projetos: *' + aba.countTotal + '*\n' +
				'- Pessoas com hospedagem solicitada: *' + aba.countHospedagem + '*';
		}

		function textoCategorias(aba) {
			return '*Por categoria — ' + aba.nome + '*\n' +
				aba.categoriasArray.map(function(c) { return '- ' + c.nome + ': *' + c.num + '*'; }).join('\n');
		}

		function textoEixosGrupo(grupo) {
			return '*Eixos - ' + grupo.categoria + '*\n' +
				grupo.eixos.map(function(e) { return '- ' + e.nome + ': *' + e.num + '*'; }).join('\n');
		}

		function textoEixosTodos(aba) {
			return aba.eixosPorCategoria.map(textoEixosGrupo).join('\n\n');
		}

		function textoProjetosPorCategoriaEixo(aba) {
			return '*Projetos por categoria/eixo (' + aba.projetos.length + ') — ' + aba.nome + '*\n\n' +
				aba.projetosPorCategoriaEixo.map(function(grupo) {
					return '*' + grupo.categoria + ' (' + grupo.total + ')*\n' +
						grupo.eixos.map(function(ge) {
							return '- ' + ge.eixo + ': *' + ge.total + '*\n' +
								ge.projetos.map(function(p) {
									return '   - Nº ' + p.numInscricao + ': ' + p.nomeProjeto + (p.nomeEscola ? ' (' + p.nomeEscola + ')' : '');
								}).join('\n');
						}).join('\n');
				}).join('\n\n');
		}

		function textoCamisetas(aba, expandido) {
			var linhas = aba.camisetasArray.map(function(cm) {
				var linha = '- Tamanho ' + cm.nome + ': *' + cm.num + '*';
				if (expandido) {
					linha += '\n' + cm.detalheCategoria.map(function(d) {
						return '  - ' + d.nome + ': ' + d.num + ' (' + d.aluno + ' aluno(a), ' + d.orientador + ' orientador(a))';
					}).join('\n');
				}
				return linha;
			});
			return '*Camisetas — ' + aba.nome + '*\n' + linhas.join('\n');
		}

		function textoEscolas(aba) {
			return '*Escolas (' + aba.escolasArray.length + ') — ' + aba.nome + '*\n' +
				aba.escolasArray.map(function(e) { return '- ' + e.nome + ': *' + e.num + '*'; }).join('\n');
		}

		function textoPessoas(tipo, aba) {
			var lista = tipo === 'Aluno' ? aba.alunosArray : aba.orientadoresArray;
			var titulo = tipo === 'Aluno' ? 'Estudantes' : 'Orientadores(as)';
			var linhas = lista.map(function(p) {
				var linha = '- ' + p.nome + (p.nomeEscola ? ' (' + p.nomeEscola + ')' : '');
				if (p.numProjetos > 1) {
					linha += ' — ' + p.numProjetos + ' projetos:\n' + p.projetos.map(function(proj) {
						return '   - Nº ' + proj.numInscricao + ': ' + proj.nomeProjeto;
					}).join('\n');
				}
				return linha;
			});
			var cabecalhoCategoria = '';
			if (tipo === 'Aluno') {
				cabecalhoCategoria = aba.alunosPorCategoria.map(function(g) { return '- ' + g.categoria + ': *' + g.total + '*'; }).join('\n') + '\n\n';
			}
			return '*' + titulo + ' (' + lista.length + ') — ' + aba.nome + '*\n' + cabecalhoCategoria + linhas.join('\n');
		}

		function textoLocalizacao(aba) {
			var partes = [];
			partes.push('*Por cidade — ' + aba.nome + '*\n' + aba.cidadesArray.map(function(c) {
				return '- ' + c.cidade + '/' + c.estado + ': ' + c.aluno + ' aluno(a), ' + c.orientador + ' orientador(a) (*' + c.total + '*)';
			}).join('\n'));
			partes.push('*Por estado — ' + aba.nome + '*\n' + aba.estadosArray.map(function(e) {
				return '- ' + e.estado + ': ' + e.aluno + ' aluno(a), ' + e.orientador + ' orientador(a) (*' + e.total + '*)';
			}).join('\n'));
			partes.push('*Por país — ' + aba.nome + '*\n' + aba.nacionalidadesArray.map(function(n) {
				return '- ' + n.nome + ': ' + n.aluno + ' aluno(a), ' + n.orientador + ' orientador(a) (*' + n.total + '*)';
			}).join('\n'));
			return partes.join('\n\n');
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
		$scope.copiarAlunos = function(aba) {
			copiarTexto(cabecalho(aba) + '\n\n' + textoPessoas('Aluno', aba));
		};
		$scope.copiarProjetosPorCategoriaEixo = function(aba) {
			copiarTexto(cabecalho(aba) + '\n\n' + textoProjetosPorCategoriaEixo(aba));
		};
		$scope.copiarProjetosPessoas = function(aba) {
			var linhas = aba.projetos.filter($scope.filtroProjeto).map(function(p) {
				return '- Nº ' + p.numInscricao + ': ' + p.nomeProjeto +
					'\n   Aluno(s): ' + (p.alunos.join(', ') || '-') +
					'\n   Orientador(es): ' + (p.orientadores.join(', ') || '-');
			});
			copiarTexto(cabecalho(aba) + '\n\n*Projetos - Alunos e Orientadores (' + linhas.length + ')*\n' + linhas.join('\n'));
		};
		$scope.copiarOrientadores = function(aba) {
			copiarTexto(cabecalho(aba) + '\n\n' + textoPessoas('Orientador', aba));
		};
		$scope.copiarLocalizacao = function(aba) {
			copiarTexto(cabecalho(aba) + '\n\n' + textoLocalizacao(aba));
		};
		$scope.copiarTudo = function(aba, expandido) {
			copiarTexto(textoCompleto(aba, expandido, false));
		};
		// "Resumo executivo": a variante compacta do "copiar tudo" - fica de fora não só
		// a tabela de escolas, mas também os quadros de pessoas (Estudantes/
		// Orientadores(as), que podem ter centenas de nomes) e Localização, que nunca
		// entraram em nenhuma variante de "copiar tudo" pelo mesmo motivo.
		$scope.copiarResumoExecutivo = function(aba) {
			copiarTexto(textoCompleto(aba, true, true));
		};

		$scope.carregarRelatorios();
	});
})();
