(function () {
  'use strict';

  angular
    .module('PDIAP')
    .config(function (
      $locationProvider,
      $httpProvider,
      $stateProvider,
      $urlMatcherFactoryProvider,
      $urlRouterProvider
    ) {
      $locationProvider.html5Mode(true);
      $urlMatcherFactoryProvider.caseInsensitive(true);
      $urlRouterProvider.otherwise('/404');

      let checkLoggedin = function ($q, $rootScope, $http, $location, $window) {
        var deferred = $q.defer(); // Inicializa nova promissa
        $rootScope.logado = false;

        $http
          .get('/projetos/loggedin')
          .then(function (response) {
            if (response.status !== 403) {
              // Authenticated
              $rootScope.logado = true;
              deferred.resolve();
            } else {
              // Not Authenticated
              $rootScope.logado = false;
              $window.location.href = 'http://movaci.com.br';
              deferred.reject();
            }
          }, function (response) {
            // Not Authenticated
            $rootScope.logado = false;
            $window.location.href = 'http://movaci.com.br';
            deferred.reject();
          });
        return deferred.promise;
      };

      // Painel único (routes/index.js#/conta/loggedin): qualquer pessoa logada - estudante,
      // orientador(a), avaliador(a), participante... Guarda em $rootScope.pessoaLogada nome,
      // senhaDefinida e os papéis (avaliador/participante). Sem login, volta pra home.
      let checkLoggedinPessoa = function ($q, $rootScope, $http, $window) {
        var deferred = $q.defer();
        $http
          .get('/conta/loggedin')
          .then(function (response) {
            $rootScope.pessoaLogada = response.data;
            deferred.resolve();
          }, function () {
            $window.location.href = '/';
            deferred.reject();
          });
        return deferred.promise;
      };

      $stateProvider
        .state('index', {
          url: '/',
          templateUrl: '/alpha/index.html',
        })

        //descomentar esse pra ativar a rota pra inscricao de projetos

        .state('inscricao', {
          url: '/projetos/inscricao',
          templateUrl: '/views/inscricao.html',
          controller: 'registroCtrl',
        })
        // Mesmo template/controller de 'inscricao', com :slug (Fase 2, ver memória
        // project-mostra-ano-nao-unico) - liga a inscrição a uma Mostra específica quando
        // houver mais de uma edição aberta em paralelo. Dois states em vez de :slug opcional
        // no mesmo state, mesmo padrão já usado neste arquivo pra :token (ex: avaliadorNovaSenha).
        .state('inscricao-edicao', {
          url: '/projetos/inscricao/:slug',
          templateUrl: '/views/inscricao.html',
          controller: 'registroCtrl',
        })

        .state('regulamento', {
          url: '/regulamento',
          templateUrl: '/alpha/regulamento.html',
        })
        .state('avaliacao-fundamental', {
          url: '/avaliacao-fundamental',
          templateUrl: '/alpha/avaliacao-fundamental.html',
        })
        .state('avaliacao-medio', {
          url: '/avaliacao-medio',
          templateUrl: '/alpha/avaliacao-medio.html',
        })
        .state('avaliacao-medio-extensao', {
          url: '/avaliacao-medio-extensao',
          templateUrl: '/alpha/avaliacao-medio-ext.html',
        })
        .state('contato', {
          url: '/contato',
          templateUrl: '/alpha/contact.html',
          controller: 'contatoCtrl',
        })
        .state('categorias-eixos', {
          url: '/categorias-eixos',
          templateUrl: '/alpha/categorias-eixos.html',
        })
        .state('programacao', {
          url: '/programacao',
          templateUrl: '/alpha/programacao.html',
        })
        //descomentar para possibilitar a inscrição de saberes docentes
        .state('saberes-docentes', {
          url: '/saberes-docentes/inscricao',
          templateUrl: '/views/saberes.html',
          controller: 'saberesCtrl',
        })
        .state('solicitar-escola', {
          url: '/solicitar-escola',
          templateUrl: '/views/solicitar-escola.html',
          controller: 'solicitarEscolaCtrl',
        })
        //descomentar para possibilitar a inscrição de avaliadores
        .state('avaliadores', {
          url: '/avaliadores/inscricao',
          templateUrl: '/views/avaliadores.html',
          controller: 'avaliadoresCtrl',
        })
        // Mesmo template/controller de 'avaliadores', com :slug - ver comentário em
        // 'inscricao-edicao' acima.
        .state('avaliadores-edicao', {
          url: '/avaliadores/inscricao/:slug',
          templateUrl: '/views/avaliadores.html',
          controller: 'avaliadoresCtrl',
        })
        .state('home', {
          url: '/projetos',
          views: {
            '': {
              templateUrl: '/views/admin.html',
              controller: 'adminCtrl',
            },
            '@home': { templateUrl: '/views/home-admin.html' },
          },
          resolve: {
            loggedin: checkLoggedin,
          },
        })
        .state('home.update', {
          url: '/update',
          templateUrl: '/views/update.html',
          controller: 'updateCtrl',
        })
        .state('home.conta', {
          url: '/update-conta',
          templateUrl: '/views/conta.html',
          controller: 'updateCtrl',
        })

        //upload dos relatorios pros projetos
        .state('home.fileUpload', {
          url: "/upload-relatorio",
          templateUrl: "/views/fileUpload.html",
          controller: "fileUploadCtrl"
        })
        .state('home.regulamento', {
          url: '/regulamento',
          templateUrl: '/views/regulamento.html',
        })
        .state('home.avaliacao-fundamental', {
          url: '/avaliacao-fundamental',
          templateUrl: '/views/avaliacao-fundamental.html',
        })
        .state('home.avaliacao-medio', {
          url: '/avaliacao-medio',
          templateUrl: '/views/avaliacao-medio.html',
        })
        .state('home.avaliacao-medio-extensao', {
          url: '/avaliacao-medio-extensao',
          templateUrl: '/views/avaliacao-medio-ext.html',
        })
        .state('home.programacao', {
          url: '/programacao',
          templateUrl: '/views/programacao.html',
        })
        .state('nova-senha', {
          url: '/nova-senha/:token',
          templateUrl: '/views/nova-senha.html',
          controller: 'redefinirCtrl',
        })

        // Painel único de qualquer pessoa logada - estados soltos (não aninhados): o "Meu
        // painel" tem o próprio menu lateral (meu-painel.html, troca de Mostra sem mudar de
        // estado), e "Meus dados"/"Trocar senha" são telas avulsas com "Voltar ao painel". =========
        .state('painel', {
          url: '/painel',
          templateUrl: '/views/meu-painel.html',
          controller: 'meuPainelCtrl',
          resolve: {
            loggedin: checkLoggedinPessoa,
          },
        })
        .state('painelTrocarSenha', {
          url: '/painel/trocar-senha',
          templateUrl: '/views/painel-trocar-senha.html',
          controller: 'painelSenhaCtrl',
          resolve: {
            loggedin: checkLoggedinPessoa,
          },
        })
        .state('painelDados', {
          url: '/painel/dados',
          templateUrl: '/views/painel-dados.html',
          resolve: {
            loggedin: checkLoggedinPessoa,
          },
        })

        // URLs antigas dos painéis separados de avaliador(a)/participante (links de e-mails já
        // enviados, favoritos): só redirecionam. A recuperação de senha antiga cai na unificada
        // (/conta/nova-senha/:token aceita os tokens antigos também).
        .state('avaliadorDashboard', { url: '/avaliadores/dashboard', redirectTo: 'painel' })
        .state('avaliadorTrocarSenha', { url: '/avaliadores/dashboard/trocar-senha', redirectTo: 'painelTrocarSenha' })
        .state('avaliadorDados', { url: '/avaliadores/dashboard/dados', redirectTo: 'painelDados' })
        .state('avaliadorEsqueciSenha', { url: '/avaliadores/dashboard/esqueci-senha', redirectTo: 'contaEsqueciSenha' })
        .state('avaliadorNovaSenha', {
          url: '/avaliadores/dashboard/nova-senha/:token',
          redirectTo: function (trans) { return { state: 'contaNovaSenha', params: { token: trans.params().token } }; },
        })
        .state('participanteDashboard', { url: '/participantes/dashboard', redirectTo: 'painel' })
        .state('participanteTrocarSenha', { url: '/participantes/dashboard/trocar-senha', redirectTo: 'painelTrocarSenha' })
        .state('participanteDados', { url: '/participantes/dashboard/dados', redirectTo: 'painelDados' })
        .state('participanteEsqueciSenha', { url: '/participantes/dashboard/esqueci-senha', redirectTo: 'contaEsqueciSenha' })
        .state('participanteNovaSenha', {
          url: '/participantes/dashboard/nova-senha/:token',
          redirectTo: function (trans) { return { state: 'contaNovaSenha', params: { token: trans.params().token } }; },
        })

        // Recuperação de senha (ver routes/index.js#/conta): funciona sem estar logado (esqueceu
        // a senha / veio de um link de e-mail) - por isso sem resolve de loggedin. =============
        .state('contaEsqueciSenha', {
          url: '/conta/esqueci-senha',
          templateUrl: '/views/conta-esqueci-senha.html',
          controller: 'contaSenhaCtrl',
        })
        .state('contaNovaSenha', {
          url: '/conta/nova-senha/:token',
          templateUrl: '/views/conta-nova-senha.html',
          controller: 'contaSenhaCtrl',
        })
        // ======================================================================
        .state('consulta_certificado', {
          url: '/certificados',
          templateUrl: '/views/consulta_certificado.html',
          controller: 'certificadosCtrl',
        })
        .state('404', {
          url: '/404',
          templateUrl: '/views/404.html',
        });
    });
})();
