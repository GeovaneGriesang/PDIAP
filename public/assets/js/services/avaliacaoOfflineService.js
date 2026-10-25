(function(){
	'use strict';

	// Avaliação no evento SEM INTERNET (Meu painel). Com internet, o painel guarda no aparelho
	// (localStorage, separado por pessoa) quem está logado, a lista de trabalhos e a ficha de cada um.
	// Se a conexão cair, a pessoa continua abrindo as fichas e avaliando: o que ela salvar fica numa
	// fila no aparelho (sobrevive a fechar o navegador e a reiniciar o celular) e é enviado sozinho
	// quando a internet volta - na hora em que volta, a cada 30 s e ao abrir o painel.
	// O servidor recebe a hora em que a avaliação foi feita (avaliadoEm) e decide (routes/painel-avaliacoes-finais.js).
	// As telas (HTML/JS) ficam guardadas pelo service worker (/sw.js).
	angular
	.module('PDIAP')
	.factory('avaliacaoOffline', function($http, $rootScope, $interval, $window, $templateRequest) {

		var BASE = '/api/painel/avaliacoes-finais/';
		var CHAVE_LOGIN = 'movaci-login';
		var enviando = false;

		var ler = function(chave, padrao) {
			try { var v = $window.localStorage.getItem(chave); return v ? JSON.parse(v) : padrao; } catch (e) { return padrao; }
		};
		var gravar = function(chave, valor) {
			try { $window.localStorage.setItem(chave, JSON.stringify(valor)); return true; } catch (e) { return false; }
		};
		var pessoaId = function() { return ($rootScope.pessoaLogada && $rootScope.pessoaLogada.id) || (ler(CHAVE_LOGIN, {}) || {}).id || 'anonimo'; };
		var chave = function() { return 'movaci-avaliacao-evento:' + pessoaId(); };
		var dados = function() {
			var d = ler(chave(), null) || {};
			d.lista = d.lista || [];
			d.fichas = d.fichas || {};
			d.fila = d.fila || {};
			d.locais = d.locais || {};
			return d;
		};
		var salvarDados = function(d) {
			var ok = gravar(chave(), d);
			$rootScope.$broadcast('avaliacaoOffline:mudou');
			return ok;
		};

		// Falha de rede (sem resposta do servidor), não um "não pode" do servidor.
		var semRede = function(response) { return !response || response.status <= 0; };

		var servico = {
			semRede: semRede,

			// --- quem está logado (ui-routes.js#checkLoggedinPessoa) ---
			guardarLogin: function(login) { gravar(CHAVE_LOGIN, login); },
			loginGuardado: function() { return ler(CHAVE_LOGIN, null); },
			// Ao sair: o aparelho esquece quem estava logado (a fila de avaliações não enviadas fica,
			// e sai quando a mesma pessoa entrar de novo com internet).
			esquecerLogin: function() { try { $window.localStorage.removeItem(CHAVE_LOGIN); } catch (e) {} },

			// --- lista e fichas baixadas ---
			// (lista e fichas não avisam "mudou" - só a fila; senão quem recarrega a lista ao ouvir o
			// aviso entraria em laço)
			guardarLista: function(lista) {
				var d = dados();
				d.lista = lista;
				d.atualizadoEm = new Date().toISOString();
				gravar(chave(), d);
			},
			lista: function() { return dados().lista; },
			guardarFicha: function(id, ficha) {
				var d = dados();
				d.fichas[id] = ficha;
				gravar(chave(), d);
			},
			ficha: function(id) { return dados().fichas[id] || null; },

			// O que está sendo digitado na ficha, gravado a cada mudança (ainda não salvo pela pessoa):
			// se a página fechar ou o celular desligar, volta como estava. Some ao salvar.
			guardarDigitado: function(id, notas, parecer) {
				var d = dados();
				d.locais[id] = { notas: notas, parecer: parecer, em: new Date().toISOString() };
				gravar(chave(), d);
			},
			digitado: function(id) { return dados().locais[id] || null; },
			esquecerDigitado: function(id) {
				var d = dados();
				delete d.locais[id];
				gravar(chave(), d);
			},

			// Baixa (com internet) as fichas dos trabalhos ainda abertos, pra estarem no aparelho se a
			// conexão cair - sem atrapalhar a tela se alguma falhar.
			prepararFichas: function(lista) {
				// A tela da ficha também (o service worker guarda; ver /sw.js).
				if ((lista || []).length) $templateRequest('/views/painel-avaliacao-final.html').catch(function() {});
				(lista || []).filter(function(a) { return a.situacao === 'pendente' || a.aberta; }).forEach(function(a) {
					$http.get(BASE + a._id).then(function(response) { servico.guardarFicha(a._id, response.data); }, function() {});
				});
			},

			// --- fila do que foi salvo sem internet ---
			// item: { notas, parecer, concluir, avaliadoEm, erro? } - um por trabalho (fica o mais recente).
			enfileirar: function(id, item) {
				var d = dados();
				d.fila[id] = item;
				// A ficha guardada passa a mostrar o que a pessoa fez.
				if (d.fichas[id]) {
					d.fichas[id].notas = item.notas;
					d.fichas[id].parecer = item.parecer;
					if (item.concluir) d.fichas[id].situacao = 'concluido';
				}
				d.lista.forEach(function(a) { if (a._id === id && item.concluir) a.situacao = 'concluido'; });
				salvarDados(d);
			},
			naFila: function(id) { return dados().fila[id] || null; },
			fila: function() {
				var f = dados().fila;
				return Object.keys(f).map(function(id) { return angular.extend({ _id: id }, f[id]); });
			},
			tirarDaFila: function(id) {
				var d = dados();
				delete d.fila[id];
				salvarDados(d);
			},

			// Envia o que está na fila. Sem rede: fica para depois. Recusado pelo servidor (ex: fora do
			// prazo, trabalho tirado da pessoa): fica com o motivo, pra pessoa ou a organização ver.
			enviarPendentes: function() {
				var itens = servico.fila().filter(function(i) { return !i.erro; });
				if (enviando || !itens.length) return;
				enviando = true;
				var proximo = function(k) {
					if (k >= itens.length) { enviando = false; $rootScope.$broadcast('avaliacaoOffline:mudou'); return; }
					var i = itens[k];
					$http.put(BASE + i._id, { notas: i.notas, parecer: i.parecer, concluir: i.concluir, avaliadoEm: i.avaliadoEm }).then(function() {
						servico.tirarDaFila(i._id);
						proximo(k + 1);
					}, function(response) {
						if (semRede(response)) { enviando = false; $rootScope.$broadcast('avaliacaoOffline:mudou'); return; }
						var d = dados();
						if (d.fila[i._id]) {
							var texto = typeof response.data === 'string' ? response.data : '';
							// Sessão expirada enquanto estava sem internet: o servidor só diz "Forbidden".
							if ((response.status === 401 || response.status === 403) && /^(forbidden|unauthorized)?$/i.test(texto.trim())) {
								texto = 'sua sessão expirou. Saia, entre de novo com seu e-mail e senha, e toque em "Tentar de novo"';
							}
							d.fila[i._id].erro = texto || 'O servidor não aceitou esta avaliação.';
							salvarDados(d);
						}
						proximo(k + 1);
					});
				};
				proximo(0);
			},
			// Tenta de novo um item recusado (a pessoa corrigiu, ou a organização reabriu).
			tentarDeNovo: function(id) {
				var d = dados();
				if (d.fila[id]) { delete d.fila[id].erro; salvarDados(d); }
				servico.enviarPendentes();
			},

			online: function() { return $window.navigator.onLine !== false; }
		};

		// Internet voltou / a cada 30 s enquanto houver fila.
		$window.addEventListener('online', function() { $rootScope.$applyAsync(servico.enviarPendentes); });
		$window.addEventListener('offline', function() { $rootScope.$applyAsync(function() { $rootScope.$broadcast('avaliacaoOffline:mudou'); }); });
		$interval(function() { if (servico.fila().length) servico.enviarPendentes(); }, 30000);

		return servico;
	});
})();
