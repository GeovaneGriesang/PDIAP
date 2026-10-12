(function(){
	'use strict';

	angular
	.module('PDIAP')
	.factory("projetosAPI", function($http, $q) {

		// Repõe .success()/.error() (removidos do Angular >=1.6, mas esse app é 1.5 e usa
		// esse padrão em toda parte) numa promise construída manualmente com $q, pra quem
		// já chama assim não precisar mudar - mesmo shim que o próprio Angular usava
		// internamente antes de remover o recurso.
		function comSuccessError(promise) {
			promise.success = function(fn) {
				promise.then(function(response) { fn(response.data, response.status, response.headers, response.config); });
				return promise;
			};
			promise.error = function(fn) {
				promise.then(null, function(response) { fn(response.data, response.status, response.headers, response.config); });
				return promise;
			};
			return promise;
		}

		let _getEdits = function(){
			const request = {
				url:'/edit',
				method: 'GET',
			}
			return $http(request);
		}

		// Campos editáveis: com um projeto aberto no painel (usarProjeto), os da Mostra DELE;
		// senão, os da Mostra atual.
		let _getOpcoes = function(){
			return $http({ url: projetoAtual.id ? urlProjeto('/opcoes') : '/getOpcoes', method: 'GET' });
		}		

		let _saveProjeto = function(projeto) {
		 	const request = {
		 		url: '/registro',
		 		method: 'POST',
		 		data: projeto
		 	}
		 	return $http(request);
		 };

		let _saveSaberesDocentes = function(saberes) {
			const request = {
				url: '/saberes-docentes/registro',
				method: 'POST',
				data: saberes
			}
			return $http(request);
		};

		let _saveAvaliador = function(avaliador) {
			const request = {
				url: '/avaliadores/registro',
				method: 'POST',
				data: avaliador
			}
			return $http(request);
		};

		// Login único (ver controllers/pessoa-controller.js#vincularPessoa): detecta se o
		// documento já é de uma Pessoa cadastrada, pra pré-preencher o formulário em vez de
		// pedir tudo de novo.
		let _verificarPessoa = function(documento, email) {
			const request = {
				url: '/pessoas/verificar',
				method: 'POST',
				data: { documento: documento, email: email }
			}
			return $http(request);
		};

		 let _postLogin = function(username,password) {
		 	const request = {
		 		url: '/login',
		 		method: 'POST',
		 		data: {
		 			username: username,
		 			password: password
		 		}
		 	}
		 	return $http(request);
		 };

		// Projeto aberto no "Meu painel" (painelProjetoCtrl chama usarProjeto(id) ao abrir): o
		// formulário de edição (update.html/updateCtrl) e o envio de relatório falam com
		// /api/painel/projetos/:id (routes/painel-projetos.js). Toda gravação manda o código da
		// trava de edição (definirTrava) no cabeçalho X-Trava.
		var projetoAtual = { id: null, trava: null };
		let _usarProjeto = function(id) {
			projetoAtual.id = id;
			projetoAtual.trava = null;
		};
		let _definirTrava = function(codigo) {
			projetoAtual.trava = codigo || null;
		};
		let urlProjeto = function(sufixo) {
			return '/api/painel/projetos/' + projetoAtual.id + (sufixo || '');
		};
		let _cabecalhosTrava = function() {
			return projetoAtual.trava ? { 'X-Trava': projetoAtual.trava } : {};
		};
		let _urlRelatorio = function() {
			return urlProjeto('/relatorio');
		};

		let _getProjeto = function() {
			return $http({ url: urlProjeto(), method: 'GET' });
		};
		let _pegarTrava = function() {
			return $http({ url: urlProjeto('/trava'), method: 'POST' });
		};
		let _renovarTrava = function() {
			return $http({ url: urlProjeto('/trava/renovar'), method: 'POST', headers: _cabecalhosTrava() });
		};
		let _liberarTrava = function() {
			return $http({ url: urlProjeto('/trava/liberar'), method: 'POST', headers: _cabecalhosTrava() });
		};

		let _getCategorias = function() {
			const request = {
				url: 'assets/js/categorias-eixos.json',
				method: 'GET',
			}
			return $http(request);
		};

		// Categorias/eixos da edição corrente da MOVACI/PDIAP (ver models/feira-schema.js,
		// tipo:'edicao') em vez do JSON estático fixo. Se nenhuma edição própria estiver
		// cadastrada pro ano informado (feira ainda não criada), cai pro JSON estático como
		// fallback - garante que inscrição/avaliadores continuam funcionando sem quebrar
		// enquanto o admin não configurar a primeira edição em Mostra.
		let _getCategoriasEixos = function(ano) {
			var deferred = $q.defer();
			$http({ url: '/getFeirasInfo', method: 'GET' }).then(function(response) {
				var edicao = (response.data || []).filter(function(f) {
					return f.tipo === 'edicao' && f.ano == ano && f.categoriasEixos && f.categoriasEixos.length;
				})[0];
				if (edicao) {
					deferred.resolve({ data: { categorias: edicao.categoriasEixos }, status: response.status });
				} else {
					_getCategorias().then(deferred.resolve, deferred.reject);
				}
			}, deferred.reject);
			return comSuccessError(deferred.promise);
		};

		// Dias/turnos em que a edição corrente aceita avaliação (ver models/feira-schema.js,
		// tipo:'edicao', diasAvaliacao) - usado pelo diaTurnoPicker no cadastro de avaliador.
		// Sem edição própria cadastrada pro ano, retorna array vazio (o picker some da tela
		// em vez de aparecer sem opções).
		let _getDiasAvaliacao = function(ano) {
			var deferred = $q.defer();
			$http({ url: '/getFeirasInfo', method: 'GET' }).then(function(response) {
				var edicao = (response.data || []).filter(function(f) {
					return f.tipo === 'edicao' && f.ano == ano;
				})[0];
				deferred.resolve({ data: { dias: (edicao && edicao.diasAvaliacao) || [] }, status: response.status });
			}, deferred.reject);
			return comSuccessError(deferred.promise);
		};

		let _getEstados = function() {
			const request = {
				url: 'assets/js/estados-cidades.json',
				method: 'GET',
			}
			return $http(request);
		};


		// Escolas aprovadas (cadastro formal, ver models/escola-schema.js) - usada pra
		// seleção no cadastro de projeto, no lugar do texto livre de antes.
		let _getEscolas = function() {
			const request = {
				url: '/getEscolasInfo',
				method: 'GET',
			}
			return $http(request);
		};

		// Solicita o cadastro de uma escola nova (não encontrada na lista) - cria como
		// pendente; usada tanto inline no cadastro de projeto quanto pelo formulário
		// público standalone (/solicitar-escola).
		let _solicitarEscola = function(escola) {
			const request = {
				url: '/solicitarEscola',
				method: 'POST',
				data: escola
			}
			return $http(request);
		};

		let _getEscolasSaberes = function() {
			const request = {
				url: '/saberes-docentes/registro',
				method: 'GET',
			}
			return $http(request);
		};

		let _putProjeto = function(projeto) {
			return $http({ url: urlProjeto(), method: 'PUT', data: projeto, headers: _cabecalhosTrava() });
		};

		let _putIntegrante = function(integrantes) {
			return $http({ url: urlProjeto('/integrantes'), method: 'PUT', data: integrantes, headers: _cabecalhosTrava() });
		};

		let _removeIntegrante = function(integrante) {
			return $http({ url: urlProjeto('/integrantes/remover'), method: 'PUT', data: integrante, headers: _cabecalhosTrava() });
		};

		let _postContato = function(contato) {
			const request = {
				url: '/contato',
				method: 'POST',
				data: contato
			}
			return $http(request);
		};

		let _postCertificado = function(cpf) {
			const request = {
				url: '/emitirCertificado',
				method: 'POST',
				data: {cpf: cpf}
			}
			return $http(request);
		};

		let _postConferirCertificado = function(token) {
			const request = {
				url: '/conferirCertificado',
				method: 'POST',
				data: {id: token}
			}
			return $http(request);
		};

		//Get na API para retornar os dados das mostras e certificados 
		let _getMostra = function(){
			const request= {
				url: '/getMostraInfo',
				method: 'GET',
			};
			return $http(request);
		}
		
		//Mateus Roberto Algayer - 07/12/2021
		let _getDocumentos = function(){
			const request = {
				url: '/getDocumentosInfo',
				method: 'GET',
			}
			return $http(request);
		}

		// Feiras cadastradas (nome, categorias, texto do certificado de classificação) -
		// usado na emissão do certificado de classificação (ver homeCtrl.js).
		let _getFeiras = function(){
			const request = {
				url: '/getFeirasInfo',
				method: 'GET',
			}
			return $http(request);
		}

		// Mostras (Feira tipo:'edicao') com status de inscrição de projetos/avaliadores por
		// edição - usado pela home (homeCtrl.js) e pelos formulários de inscrição
		// (registroCtrl.js/avaliadoresCtrl.js) pra resolver a edição certa pelo slug da URL,
		// ou pela única edição aberta quando não há slug. Ver Fase 2, memória
		// project-mostra-ano-nao-unico.
		let _getEdicoesInscricao = function(){
			const request = {
				url: '/getEdicoesInscricao',
				method: 'GET',
			}
			return $http(request);
		}

		return {
			getEdits: _getEdits,
			getOpcoes: _getOpcoes,
			saveProjeto: _saveProjeto,
			saveSaberesDocentes: _saveSaberesDocentes,
			saveAvaliador: _saveAvaliador,
			verificarPessoa: _verificarPessoa,
			getEdicoesInscricao: _getEdicoesInscricao,
			postLogin: _postLogin,
			getProjeto: _getProjeto,
			usarProjeto: _usarProjeto,
			definirTrava: _definirTrava,
			cabecalhosTrava: _cabecalhosTrava,
			urlRelatorio: _urlRelatorio,
			pegarTrava: _pegarTrava,
			renovarTrava: _renovarTrava,
			liberarTrava: _liberarTrava,
			getCategorias: _getCategorias,
			getCategoriasEixos: _getCategoriasEixos,
			getDiasAvaliacao: _getDiasAvaliacao,
			getEstados: _getEstados,
			getEscolas: _getEscolas,
			solicitarEscola: _solicitarEscola,
			getEscolasSaberes: _getEscolasSaberes,
			//Descomentar para salvar alterações dos projetos inscritos
			putProjeto: _putProjeto,
			putIntegrante: _putIntegrante,
			postContato: _postContato,
			removeIntegrante: _removeIntegrante,
			postCertificado: _postCertificado,
			postConferirCertificado: _postConferirCertificado,
			getMostra: _getMostra,
			getDocumentos: _getDocumentos,
			getFeiras: _getFeiras,
		};
	});
})();
