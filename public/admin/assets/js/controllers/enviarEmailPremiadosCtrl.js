// Ordem pedagógica de categoria/eixo (mesma usada no Ranking, GRUPOS_EIXOS em rankingCtrl.js),
// usada só pra oferecer "Categoria/Eixo" como critério de ordenação alternativo ao de
// Colocação - orderBy alfabético colocaria "Ensino Médio..." antes de "Fundamental I".
var ORDEM_CATEGORIA_EIXO = [
	['Fundamental I', 'Ciências da Natureza e suas tecnologias'],
	['Fundamental I', 'Ciências Humanas e suas tecnologias'],
	['Fundamental I', 'Linguagens, Códigos e suas tecnologias'],
	['Fundamental I', 'Matemática e suas tecnologias'],
	['Fundamental II', 'Ciências da Natureza e suas tecnologias'],
	['Fundamental II', 'Ciências Humanas e suas tecnologias'],
	['Fundamental II', 'Linguagens, Códigos e suas tecnologias'],
	['Fundamental II', 'Matemática e suas tecnologias'],
	['Ensino Médio, Técnico e Superior', 'Ciências Agrárias, Exatas e da Terra'],
	['Ensino Médio, Técnico e Superior', 'Ciências Ambientais, Biológicas e da Saúde'],
	['Ensino Médio, Técnico e Superior', 'Ciências Humanas e Sociais Aplicadas'],
	['Ensino Médio, Técnico e Superior', 'Línguas e Artes'],
	['Ensino Médio, Técnico e Superior', 'Extensão'],
	['Ensino Médio, Técnico e Superior', 'Ciências da Computação'],
	['Ensino Médio, Técnico e Superior', 'Engenharias']
];
function _ordemCategoriaEixo(categoria, eixo) {
	for (var i = 0; i < ORDEM_CATEGORIA_EIXO.length; i++) {
		if (ORDEM_CATEGORIA_EIXO[i][0] === categoria && ORDEM_CATEGORIA_EIXO[i][1] === eixo) return i;
	}
	return 999;
}

// Resolve ¨SE(condicao;seVerdadeiro;seFalso) escaneando parênteses na mão (uma regex simples
// quebraria com parênteses dentro dos textos, ex: "Fundamental I (1º ao 5º anos)"). Suporta
// ¨SE aninhado dentro dos próprios ramos verdadeiro/falso, resolvido por recursão.
// `avaliarCondicao(condicao)` decide qual ramo vale - quem chama decide a regra (dado real de
// um projeto, ao enviar de verdade, ou "força sempre verdadeiro/falso", na pré-visualização).
function _resolveCondicionais(texto, avaliarCondicao) {
	texto = texto || '';
	var resultado = '';
	var i = 0;
	while (i < texto.length) {
		var inicio = texto.indexOf('¨SE(', i);
		if (inicio === -1) { resultado += texto.slice(i); break; }
		resultado += texto.slice(i, inicio);
		var pos = inicio + 4;
		var profundidade = 1;
		var args = [];
		var argAtual = '';
		while (pos < texto.length && profundidade > 0) {
			var ch = texto[pos];
			if (ch === '(') { profundidade++; argAtual += ch; }
			else if (ch === ')') {
				profundidade--;
				if (profundidade === 0) break;
				argAtual += ch;
			} else if (ch === ';' && profundidade === 1 && args.length < 2) {
				args.push(argAtual);
				argAtual = '';
			} else {
				argAtual += ch;
			}
			pos++;
		}
		args.push(argAtual);
		while (args.length < 3) args.push('');
		if (pos >= texto.length && texto[pos] !== ')') {
			// ¨SE( sem fechamento - não é um comando válido, deixa como texto literal e segue.
			resultado += texto.slice(inicio, pos + 1);
			i = pos + 1;
			continue;
		}
		var condicao = args[0].trim();
		var textoVerdadeiro = _resolveCondicionais(args[1], avaliarCondicao);
		var textoFalso = _resolveCondicionais(args[2], avaliarCondicao);
		resultado += avaliarCondicao(condicao) ? textoVerdadeiro : textoFalso;
		i = pos + 1;
	}
	return resultado;
}

function _avaliarCondicaoPorDados(dados) {
	return function(condicao) {
		var chave = condicao.replace(/^¨/, '').toUpperCase();
		if (chave === 'CLASSIFICADO') return !!dados.classificado;
		if (chave === 'PREMIADO') return !!dados.premiado;
		if (chave === 'MENCAO_HONROSA') return !!dados.mencaoHonrosa;
		return false;
	};
}

(function(){
	'use strict';

	// Mesmo espírito de enviarEmailProjetosCtrl.js, mas já filtrado pra só os projetos em
	// destaque (Premiado, Menção honrosa ou classificado pra alguma feira externa - ver
	// Projetos > Premiação), com colocação/premiação/classificação disponíveis como máscara,
	// inclusive a máscara condicional ¨SE() (ver _resolveCondicionais acima).
	angular
	.module('PDIAPa')
	.controller('enviarEmailPremiadosCtrl', function($scope, $rootScope, $mdDialog, adminAPI) {

		$scope.projetos = [];
		$scope.year = CadastraAno();
		$rootScope.ano = $rootScope.ano || new Date().getFullYear();

		// _id da feira -> nome, só pra resolver a máscara ¨feiraNome na pré-visualização (o
		// envio de verdade resolve isso no servidor, já com populate de feirasClassificadas).
		var nomesFeiras = {};
		adminAPI.getFeiras()
		.success(function(feiras) {
			angular.forEach(feiras, function(f) { nomesFeiras[f._id] = f.nome; });
		})
		.error(function(status) { console.log(status); });

		let carregarProjetos = function() {
			$scope.projetos = [];
			adminAPI.getTodosProjetos()
			.success(function(projetos) {
				angular.forEach(projetos, function(value) {
					var ano = new Date(value.createdAt).getFullYear();
					var classificado = !!(value.feirasClassificadas && value.feirasClassificadas.length > 0);
					var emDestaque = value.premiacao === 'Premiado' || value.premiacao === 'Mencao_honrosa' || classificado;
					if (ano == $rootScope.ano && emDestaque) {
						$scope.projetos.push({
							_id: value._id,
							numInscricao: value.numInscricao,
							nomeProjeto: value.nomeProjeto,
							nomeEscola: value.nomeEscola,
							categoria: value.categoria,
							eixo: value.eixo,
							colocacao: value.colocacao,
							premiacao: value.premiacao,
							feirasClassificadas: value.feirasClassificadas || [],
							estado: value.estado,
							cidade: value.cidade,
							email: value.email,
							integrantes: value.integrantes,
							_ordemCategoriaEixo: _ordemCategoriaEixo(value.categoria, value.eixo)
						});
					}
				});
			})
			.error(function(status) {
				console.log(status);
			});
		};
		carregarProjetos();

		$scope.recarregar = function() {
			$scope.idsSelecionados = [];
			carregarProjetos();
		};

		$scope.query = 'nomeProjeto';
		$scope.setBusca = function(campo) {
			$scope.query = campo;
		};

		// "Colocação" é o critério padrão (histórico); "Categoria/Eixo" agrupa na ordem
		// pedagógica (ver ORDEM_CATEGORIA_EIXO), com colocação como critério dentro do eixo.
		$scope.criterioOrdenacao = 'colocacao';
		$scope.ordenacao = ['colocacao', 'categoria'];
		$scope.recarregarOrdenacao = function(criterio) {
			$scope.ordenacao = criterio === 'categoriaEixo' ? ['_ordemCategoriaEixo', 'colocacao'] : ['colocacao', 'categoria'];
		};

		// Seleção de projetos como destinatários (mesmo espírito de enviarEmailProjetosCtrl.js).
		$scope.idsSelecionados = [];
		$scope.contador = function(checked, id) {
			var idx = $scope.idsSelecionados.indexOf(id);
			if (checked && idx === -1) $scope.idsSelecionados.push(id);
			if (!checked && idx !== -1) $scope.idsSelecionados.splice(idx, 1);
		};
		$scope.selecionarTodosFiltrados = function(listaFiltrada) {
			angular.forEach($scope.projetos, function(p) { p.selecionado = false; });
			angular.forEach(listaFiltrada, function(p) { p.selecionado = true; });
			$scope.idsSelecionados = listaFiltrada.map(function(p) { return p._id; });
		};
		$scope.limparSelecao = function() {
			angular.forEach($scope.projetos, function(p) { p.selecionado = false; });
			$scope.idsSelecionados = [];
		};
		// Seleciona só quem está no status pedido, dentro da lista já filtrada pela busca -
		// mesmo espírito de selecionarTodosFiltrados, mas restrito por status.
		$scope.selecionarPorStatus = function(listaFiltrada, status) {
			var alvo = listaFiltrada.filter(function(p) {
				if (status === 'Classificado') return p.feirasClassificadas.length > 0;
				return p.premiacao === status;
			});
			angular.forEach($scope.projetos, function(p) { p.selecionado = false; });
			angular.forEach(alvo, function(p) { p.selecionado = true; });
			$scope.idsSelecionados = alvo.map(function(p) { return p._id; });
		};

		// Máscaras disponíveis pra essa tela (ver diretiva mascarasLegenda.js): "mascara" é a
		// substituição simples de sempre (chip verde); "condicao" é o ¨SE(...) (chip azul,
		// insere um molde pronto pra editar); "variavel" são os booleanos que só fazem sentido
		// dentro de uma condição ¨SE() (chip numa terceira cor, pra não confundir com as duas
		// anteriores).
		$scope.mascarasDisponiveis = [
			{chave:'nome', desc:'Nome do destinatário (aluno(a), orientador(a) ou nome do projeto, conforme o destinatário escolhido)'},
			{chave:'nomeProjeto', desc:'Nome do projeto'},
			{chave:'colocacao', desc:'Colocação (1º, 2º, 3º...), definida em Projetos > Premiação'},
			{chave:'categoria', desc:'Categoria do projeto'},
			{chave:'eixo', desc:'Eixo do projeto'},
			{chave:'numInscricao', desc:'Número de inscrição do projeto'},
			{chave:'nomeEscola', desc:'Nome da escola'},
			{chave:'estado', desc:'Estado do projeto'},
			{chave:'cidade', desc:'Cidade do projeto'},
			{chave:'feiraNome', desc:'Nome da(s) feira(s) para a(s) qual(is) o projeto foi classificado (vazio se nenhuma)'},
			{
				tipo:'condicao', chave:'SE(condição;seVerdadeiro;seFalso)', insere:'¨SE(¨PREMIADO;;)',
				desc:'Condição: escreve um texto diferente dependendo da condição. Ex.: ¨SE(¨CLASSIFICADO;Você classificou para ¨feiraNome!;). Pode aninhar outro ¨SE() dentro do "seVerdadeiro"/"seFalso".'
			},
			{tipo:'variavel', chave:'CLASSIFICADO', desc:'Verdadeiro se o projeto foi classificado para alguma feira externa. Só faz sentido dentro de um ¨SE(...)'},
			{tipo:'variavel', chave:'PREMIADO', desc:'Verdadeiro se o projeto foi marcado como Premiado. Só faz sentido dentro de um ¨SE(...)'},
			{tipo:'variavel', chave:'MENCAO_HONROSA', desc:'Verdadeiro se o projeto recebeu Menção honrosa. Só faz sentido dentro de um ¨SE(...)'}
		];

		// Mesmo mecanismo de máscaras ¨chave usado nos textos de certificado (homeCtrl.js),
		// aqui só para a pré-visualização — o envio de verdade roda a mesma lógica no servidor.
		function _aplicaMascaras(texto, dados) {
			return (texto || '').replace(/¨\w+/g, function(match) {
				var chave = match.slice(1);
				return dados[chave] !== undefined && dados[chave] !== null ? String(dados[chave]) : match;
			});
		}

		function _dadosDoProjeto(projeto) {
			var feiraNome = (projeto.feirasClassificadas || []).map(function(id) { return nomesFeiras[id]; }).filter(Boolean).join(', ');
			return {
				nome: projeto.nomeProjeto, nomeProjeto: projeto.nomeProjeto, colocacao: projeto.colocacao,
				categoria: projeto.categoria, eixo: projeto.eixo, numInscricao: projeto.numInscricao,
				nomeEscola: projeto.nomeEscola, estado: projeto.estado, cidade: projeto.cidade,
				feiraNome: feiraNome,
				premiado: projeto.premiacao === 'Premiado',
				mencaoHonrosa: projeto.premiacao === 'Mencao_honrosa',
				classificado: projeto.feirasClassificadas.length > 0
			};
		}

		$scope.previaAssunto = '';
		$scope.previaCorpo = '';
		$scope.previaTemCondicao = false;
		$scope.previaAssuntoVerdadeiro = '';
		$scope.previaCorpoVerdadeiro = '';
		$scope.previaAssuntoFalso = '';
		$scope.previaCorpoFalso = '';
		$scope.gerarPreVisualizacao = function() {
			var projeto = $scope.projetos.filter(function(p) { return $scope.idsSelecionados.indexOf(p._id) !== -1; })[0];
			if (!projeto) return;
			var dados = _dadosDoProjeto(projeto);

			$scope.previaTemCondicao = /¨SE\(/.test($scope.assunto || '') || /¨SE\(/.test($scope.corpo || '');
			if ($scope.previaTemCondicao) {
				// Com condição, mostra os dois cenários possíveis (independente do que esse
				// projeto específico realmente é) - é isso que ajuda a revisar o texto antes
				// de mandar pra uma lista com projetos em situações diferentes.
				$scope.previaAssuntoVerdadeiro = _aplicaMascaras(_resolveCondicionais($scope.assunto, function() { return true; }), dados);
				$scope.previaCorpoVerdadeiro = _aplicaMascaras(_resolveCondicionais($scope.corpo, function() { return true; }), dados);
				$scope.previaAssuntoFalso = _aplicaMascaras(_resolveCondicionais($scope.assunto, function() { return false; }), dados);
				$scope.previaCorpoFalso = _aplicaMascaras(_resolveCondicionais($scope.corpo, function() { return false; }), dados);
			} else {
				$scope.previaAssunto = _aplicaMascaras($scope.assunto, dados);
				$scope.previaCorpo = _aplicaMascaras($scope.corpo, dados);
			}
		};

		$scope.enviar = function(ev) {
			var confirm = $mdDialog.confirm()
				.title('Enviar e-mail?')
				.textContent('Isso vai enviar o e-mail para os destinatários (' + $scope.destinatario + ') dos ' + $scope.idsSelecionados.length + ' projeto(s) selecionado(s). Essa ação não pode ser desfeita.')
				.targetEvent(ev)
				.ok('Enviar')
				.cancel('Cancelar');
			$mdDialog.show(confirm).then(function() {
				adminAPI.postEnviarEmailPremiados({
					idsProjetos: $scope.idsSelecionados,
					destinatario: $scope.destinatario,
					assunto: $scope.assunto,
					corpo: $scope.corpo
				})
				.success(function(data) {
					$scope.toast('E-mail sendo enviado para ' + data.total + ' destinatário(s)!', 'success-toast');
				})
				.error(function(status) {
					$scope.toast('Falha ao enviar. ' + status, 'failed-toast');
				});
			}, function() {});
		};
	});
})();
