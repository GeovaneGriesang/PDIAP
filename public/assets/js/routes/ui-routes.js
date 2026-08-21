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
          .success(function (projeto, status) {
            if (status !== 403) {
              // Authenticated
              $rootScope.logado = true;
              deferred.resolve();
            } else {
              // Not Authenticated
              $rootScope.logado = false;
              $window.location.href = 'http://movaci.com.br';
              deferred.reject();
            }
          })

          .error(function (status) {
            // Not Authenticated
            $rootScope.logado = false;
            $window.location.href = 'http://movaci.com.br';
            deferred.reject();
          });
        return deferred.promise;
      };

      // Mesmo padrão de checkLoggedin, mas pro dashboard do avaliador (login próprio,
      // separado do login de projeto) - ver routes/avaliadores.js#ensureAvaliador.
      let checkLoggedinAvaliador = function ($q, $rootScope, $http, $window) {
        var deferred = $q.defer();
        $rootScope.logadoAvaliador = false;

        $http
          .get('/avaliadores/dashboard/loggedin')
          .success(function (avaliador, status) {
            if (status !== 403) {
              $rootScope.logadoAvaliador = true;
              $rootScope.avaliadorLogado = avaliador;
              deferred.resolve();
            } else {
              $window.location.href = 'http://movaci.com.br';
              deferred.reject();
            }
          })
          .error(function (status) {
            $window.location.href = 'http://movaci.com.br';
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
        //descomentar para possibilitar a inscrição de avaliadores
        .state('avaliadores', {
          url: '/avaliadores/inscricao',
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

        // Dashboard do avaliador (login próprio) - estados soltos (não aninhados) de
        // propósito, cada tela já vem com seu próprio cabeçalho simples (ver views), sem
        // precisar de um shell com sidenav como o do Projeto (home/admin.html). =========
        .state('avaliadorDashboard', {
          url: '/avaliadores/dashboard',
          templateUrl: '/views/avaliador-dashboard.html',
          controller: 'avaliadorDashboardCtrl',
          resolve: {
            loggedin: checkLoggedinAvaliador,
          },
        })
        .state('avaliadorTrocarSenha', {
          url: '/avaliadores/dashboard/trocar-senha',
          templateUrl: '/views/avaliador-trocar-senha.html',
          controller: 'avaliadorSenhaCtrl',
          resolve: {
            loggedin: checkLoggedinAvaliador,
          },
        })
        .state('avaliadorDados', {
          url: '/avaliadores/dashboard/dados',
          templateUrl: '/views/avaliador-dados.html',
          controller: 'avaliadorDadosCtrl',
          resolve: {
            loggedin: checkLoggedinAvaliador,
          },
        })
        // As duas abaixo precisam funcionar sem estar logado (esqueceu a senha / veio de
        // um link de e-mail) - por isso não têm o resolve de loggedin.
        .state('avaliadorEsqueciSenha', {
          url: '/avaliadores/dashboard/esqueci-senha',
          templateUrl: '/views/avaliador-esqueci-senha.html',
          controller: 'avaliadorSenhaCtrl',
        })
        .state('avaliadorNovaSenha', {
          url: '/avaliadores/dashboard/nova-senha/:token',
          templateUrl: '/views/avaliador-trocar-senha.html',
          controller: 'avaliadorSenhaCtrl',
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
