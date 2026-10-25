// Service worker do Meu painel (registrado em views/layout.ejs): guarda as telas (HTML, JS, CSS,
// modelos e ícones) para o painel abrir SEM INTERNET - a avaliação no evento continua funcionando
// se a conexão cair, mesmo fechando e abrindo o navegador. Os dados (lista, fichas, avaliações
// ainda não enviadas) ficam no localStorage (assets/js/services/avaliacaoOfflineService.js).
//
// Sempre tenta a rede primeiro: com internet, nada muda (código novo do servidor vale na hora); a
// cópia guardada só é usada quando a rede falha. Nunca guarda API nem o admin.

var CACHE = 'movaci-painel-v1';
var TELA = '/painel'; // todas as telas /painel/... são a mesma página (views/layout.ejs)
var GUARDAR = [/^\/assets\//, /^\/bower_components\//, /^\/views\//, /^\/alpha\/images\//];

// Telas que o painel abre (ui-router) - o resto (scripts e estilos) sai do próprio HTML.
var MODELOS = ['/views/meu-painel.html', '/views/painel-avaliacao-final.html', '/assets/mdi.svg', '/alpha/images/favicon.png', '/assets/images/logo3-b.png'];

// Já na instalação guarda a página e tudo o que ela carrega: na primeira visita o service worker
// ainda não controlava a página quando os scripts foram baixados.
self.addEventListener('install', function(event) {
	event.waitUntil(caches.open(CACHE).then(function(cache) {
		return fetch(TELA, { credentials: 'same-origin' }).then(function(resposta) {
			if (!resposta.ok) return;
			return resposta.clone().text().then(function(html) {
				var arquivos = [], re = /(?:src|href)="([^"#?]+\.(?:js|css|svg|png))"/g, m;
				while ((m = re.exec(html))) {
					if (/^https?:/.test(m[1])) continue;
					arquivos.push(m[1].charAt(0) === '/' ? m[1] : '/' + m[1]);
				}
				return cache.put(TELA, resposta).then(function() {
					return Promise.all(arquivos.concat(MODELOS).map(function(a) { return cache.add(a).catch(function() {}); }));
				});
			});
		}).catch(function() {});
	}).then(function() { return self.skipWaiting(); }));
});

self.addEventListener('activate', function(event) {
	event.waitUntil(caches.keys().then(function(chaves) {
		return Promise.all(chaves.filter(function(c) { return c !== CACHE; }).map(function(c) { return caches.delete(c); }));
	}).then(function() { return self.clients.claim(); }));
});

function redePrimeiro(request, chave) {
	return fetch(request).then(function(resposta) {
		if (resposta && resposta.ok && resposta.type === 'basic') {
			var copia = resposta.clone();
			caches.open(CACHE).then(function(cache) { cache.put(chave || request, copia); });
		}
		return resposta;
	}).catch(function() {
		return caches.match(chave || request, { ignoreSearch: !chave }).then(function(guardada) {
			return guardada || Response.error();
		});
	});
}

self.addEventListener('fetch', function(event) {
	var req = event.request;
	if (req.method !== 'GET') return;
	var url = new URL(req.url);
	if (url.origin !== self.location.origin) return;
	if (req.mode === 'navigate') {
		if (url.pathname === TELA || url.pathname.indexOf(TELA + '/') === 0) event.respondWith(redePrimeiro(req, TELA));
		return;
	}
	if (GUARDAR.some(function(r) { return r.test(url.pathname); })) event.respondWith(redePrimeiro(req));
});
