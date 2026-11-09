(function () {
  'use strict';

  // Página pública "Sobre" (/sobre): história do PDIAP ano a ano, com as equipes de cada
  // projeto. Fonte dos dados: projetos registrados no SUAP, relatórios finais, planos de
  // trabalho e histórico do repositório. Para acrescentar um ano, basta incluir um item em
  // $scope.fases - os totais do topo são calculados a partir daqui.
  angular
    .module('PDIAP')
    .controller('sobreCtrl', function ($scope) {

      $scope.fases = [
        {
          ano: '2016',
          titulo: 'PDIAP: Plataforma Digital de Inscrição e Administração de Projetos',
          rotulo: 'Criação da plataforma',
          periodo: 'maio a dezembro de 2016',
          edital: 'Edital PROPESP 01/2016',
          mostra: 'V MOVACI',
          coordenacao: ['Geovane Griesang'],
          colaboracao: ['Daniel Pezzi da Cunha', 'Fábio Lorenzi da Silva', 'Itamar Luís Hammes', 'Marlon Mendes Minussi'],
          bolsistas: ['Ricardo Swarovsky Garim', 'Tiago André Portaluppi'],
          voluntarios: ['Fernando Hansel'],
          resumo: 'Nasce a plataforma. A partir das necessidades da comissão organizadora da MOVACI, a equipe levantou os requisitos, escolheu as ferramentas e colocou no ar, em poucos meses, o primeiro sistema de inscrição de projetos da mostra, que até então dependia de e-mails e planilhas.',
          destaques: [
            'Escolha da pilha MEAN (MongoDB, Express, AngularJS e Node.js), toda em software livre',
            'Inscrição de projetos pela internet, com dados de estudantes, orientadores(as) e escola',
            'Área administrativa para a comissão acompanhar os projetos inscritos',
            'Primeiro uso real na V MOVACI, em setembro de 2016'
          ]
        },
        {
          ano: '2017',
          titulo: 'PDIAP: Plataforma Digital de Inscrição e Administração de Projetos',
          rotulo: 'Automação e avaliação',
          periodo: 'agosto de 2017 a julho de 2018',
          edital: 'Edital PROPESP 03/2017',
          mostra: 'VI MOVACI',
          coordenacao: ['Geovane Griesang'],
          colaboracao: ['Fábio Lorenzi da Silva'],
          bolsistas: [],
          voluntarios: ['Bernardo Werlang', 'Fernando Hansel', 'Guilherme Johann Reckziegel Nunes', 'Kallel Roman'],
          resumo: 'Depois da primeira edição, o foco foi corrigir o que a prática mostrou e automatizar o que ainda era feito à mão. A plataforma passou a cobrir também a avaliação dos trabalhos e a entrega de resultados.',
          destaques: [
            'Cadastro de avaliadores(as) e lançamento de notas com ranking dos projetos',
            'Envio do relatório do projeto pela própria plataforma',
            'Emissão de certificados direto no site',
            'Lista de projetos destaque e início da documentação técnica',
            'O próprio PDIAP foi apresentado como projeto na VI MOVACI'
          ]
        },
        {
          ano: '2018',
          titulo: 'PDIAP e IFIntegra',
          projetos: 2,
          rotulo: 'Autonomia da organização',
          periodo: 'agosto de 2018 a julho de 2019',
          edital: 'Edital PROPESP 06/2018',
          mostra: 'VII MOVACI',
          coordenacao: ['Miguel Angelo Baggio (PDIAP)', 'Geovane Griesang (IFIntegra)'],
          colaboracao: ['Daniel Pezzi da Cunha', 'Geovane Griesang'],
          bolsistas: ['Daiano Henrique Giehl', 'Roberto José Mahl', 'Rosnei Leonardo de Almeida', 'Victor Emanuel Ferreira'],
          voluntarios: ['Guilherme Johann Reckziegel Nunes'],
          resumo: 'A organização ganha autonomia: várias mudanças que antes exigiam alterar o código passam a ser feitas pela tela de administração. Em paralelo, nasce o IFIntegra, que liga o PDIAP à biblioteca digital de artigos do câmpus.',
          destaques: [
            'Painel para a organização editar a tela inicial e abrir ou fechar inscrições de projetos, avaliadores(as) e eventos',
            'Edição de projetos pela organização, relatórios gerais, camisetas e hospedagem',
            'Presença de avaliadores(as), telas de premiação, menção honrosa e Saberes Docentes',
            'Correções na geração de certificados e de PDFs',
            'IFIntegra: integração dos dados do PDIAP com o IFPublica (biblioteca digital)',
            'Manual de instalação para Ubuntu'
          ]
        },
        {
          ano: '2019',
          titulo: 'PDIAP e IFIntegra',
          projetos: 2,
          rotulo: 'Relatórios e integração',
          periodo: 'agosto de 2019 a junho de 2021',
          edital: 'Edital PROPESP 03/2019',
          mostra: '',
          coordenacao: ['Miguel Angelo Baggio (PDIAP)', 'Geovane Griesang (IFIntegra)'],
          colaboracao: ['Daniel Pezzi da Cunha', 'Geovane Griesang'],
          bolsistas: [],
          voluntarios: ['Ana Paula Goetze', 'Mateus Roberto Algayer', 'Nicolas Daniel Bugs', 'Roberto José Mahl'],
          resumo: 'Ano de consolidar a base: correções, novos relatórios para a administração e documentação mais completa, para que novas equipes conseguissem continuar o trabalho.',
          destaques: [
            'Relatórios de acompanhamento para a administração (por exemplo, estudantes presentes)',
            'Mais funções administrativas sem necessidade de alterar o código',
            'Documentação ampliada para as próximas equipes',
            'IFIntegra: aplicação em Node.js e tela de exportação dos dados para a biblioteca digital'
          ]
        },
        {
          ano: '2020',
          titulo: 'PDIAPIA: Plataforma Digital de Inscrição, Administração de Projetos e Integração de Ambientes',
          rotulo: 'Fase 1 · Certificados dinâmicos',
          periodo: 'agosto de 2020 a dezembro de 2021',
          edital: 'Edital PROPESP 06/2020',
          mostra: '',
          coordenacao: ['Geovane Griesang'],
          colaboracao: ['Daniel Pezzi da Cunha', 'Fábio Lorenzi da Silva'],
          bolsistas: ['Mateus Roberto Algayer'],
          voluntarios: ['Ana Paula Goetze', 'Nicolas Daniel Bugs'],
          resumo: 'Em plena pandemia, PDIAP e IFIntegra se juntam no PDIAPIA. O grande avanço foi tirar os certificados de dentro do código: a organização passou a cadastrar os próprios modelos.',
          destaques: [
            'Modelos de certificado cadastrados pela organização (texto, imagem de fundo e ano)',
            'Máscaras que preenchem os dados de cada pessoa no certificado',
            'Cadastro dinâmico de anos/edições',
            'Conclusão da exportação de dados para a biblioteca digital (IFPublica)'
          ]
        },
        {
          ano: '2021',
          titulo: 'PDIAPIA: Fase 2',
          rotulo: 'Fase 2 · Menos código, mais configuração',
          periodo: 'agosto de 2021 a agosto de 2022',
          edital: 'Edital PROPESP 04/2021',
          mostra: '',
          coordenacao: ['Geovane Griesang'],
          colaboracao: ['Fábio Lorenzi da Silva', 'Lucas Alfonso Meyer'],
          bolsistas: ['Leandro Henrique Kopp Ferreira', 'Lucas Eduardo Müller Garth'],
          voluntarios: ['Marlon Juliano Lima Weber Filho', 'Mateus Roberto Algayer'],
          resumo: 'Revisão do código para pagar dívidas técnicas acumuladas e deixar a plataforma cada vez menos dependente de programação para funcionar a cada edição.',
          destaques: [
            'Correção do cadastro de pessoas e da recuperação de senha',
            'Menu de documentos dinâmico: a organização publica regulamentos e fichas sem mexer no código',
            'Tela inicial reorganizada, com a localização do câmpus atualizada',
            'Melhorias de navegação e no visual dos PDFs'
          ]
        },
        {
          ano: '2022',
          titulo: 'PDIAPIA: Fase 3',
          rotulo: 'Fase 3 · Comunicação e inclusão',
          periodo: 'setembro de 2022 a agosto de 2023',
          edital: 'Edital PROPESP 09/2022',
          mostra: 'VIII MOVACI',
          coordenacao: ['Geovane Griesang'],
          colaboracao: [],
          bolsistas: ['Lucas Eduardo Müller Garth'],
          voluntarios: ['Juan Altair Almada Martins', 'Leandro Henrique Kopp Ferreira', 'Lucas Antônio Ferreira', 'Marlon Juliano Lima Weber Filho', 'Matheus Augusto Heinen'],
          resumo: 'A plataforma passa a conversar com quem participa e abre espaço para estudantes de outros países. O projeto foi destaque na área de Ciências Exatas e da Terra na 16ª JIC do IFSul.',
          destaques: [
            'Envio de e-mails da organização para as equipes inscritas (por exemplo, dia e horário de apresentação)',
            'Inscrição de estudantes estrangeiros(as), com documento e cidade de origem',
            'Marcação de projetos classificados para a Mostratec Júnior e a MOCITEC, com texto próprio no certificado'
          ]
        },
        {
          ano: '2023',
          titulo: 'PDIAP: Fase 4',
          rotulo: 'Fase 4 · Estabilidade',
          periodo: 'setembro de 2023 a agosto de 2024',
          edital: 'Edital PROPESP 08/2023',
          mostra: '',
          coordenacao: ['Geovane Griesang'],
          colaboracao: [],
          bolsistas: ['Mariana Ferreira Tica'],
          voluntarios: ['Mateus Roberto Algayer'],
          resumo: 'Fase dedicada a testar a plataforma de ponta a ponta, corrigir falhas encontradas no uso e preparar a chegada de novas pessoas à equipe.',
          destaques: [
            'Tratamento de erros e correção de dados duplicados no cadastro de participantes',
            'Filtro por categoria no envio de e-mails e contador de projetos corrigido',
            'Guia de instalação para novos(as) integrantes do projeto'
          ]
        },
        {
          ano: '2024',
          titulo: 'PDIAP: Fase 5',
          rotulo: 'Fase 5 · Dados confiáveis',
          periodo: 'outubro de 2024 a agosto de 2025',
          edital: 'Edital PROPESP 06/2024 e Edital de Ações Afirmativas 07/2024',
          mostra: 'IX MOVACI',
          coordenacao: ['Geovane Griesang'],
          colaboracao: [],
          bolsistas: ['Letícia dos Santos Fagundes', 'Mariana Ferreira Tica', 'Rafaela Dettenborn dos Santos'],
          voluntarios: ['Guilherme Luis Becker', 'Manuela Ferreira Tica', 'Tiago Gabriel Cardoso'],
          resumo: 'Ano de reconhecimento: o software foi registrado no INPI e a trajetória do projeto foi publicada. Na prática, a equipe recuperou e padronizou as bases de dados e acompanhou de perto as inscrições da IX MOVACI.',
          destaques: [
            'Registro do programa de computador no INPI (processo BR512024004960-6)',
            'Recuperação e padronização das bases de dados',
            'Formulários de inscrição mais claros, com menos erros de preenchimento',
            'Testes de todos os módulos e suporte direto às pessoas inscritas'
          ]
        },
        {
          ano: '2025',
          titulo: 'PDIAP: Fase 6',
          rotulo: 'Fase 6 · A mostra inteira na plataforma',
          periodo: 'setembro de 2025 a agosto de 2026',
          edital: 'Edital PROPESP 05/2025 e Edital de Ações Afirmativas 08/2025',
          mostra: 'X MOVACI',
          coordenacao: ['Geovane Griesang'],
          colaboracao: [],
          bolsistas: ['Letícia dos Santos Fagundes', 'Manuela Ferreira Tica', 'Rafaela Dettenborn dos Santos'],
          voluntarios: [],
          resumo: 'A X MOVACI foi organizada do início ao fim dentro da plataforma: das inscrições ao resultado, passando por escolas, avaliadores(as), e-mails e relatórios.',
          destaques: [
            'Login e painel próprios para avaliadores(as) e participantes',
            'Cadastro formal de escolas, com pedido de inclusão pela própria escola',
            'Relatórios redesenhados, com gráficos, planilhas e PDF',
            'E-mails em grupo com máscaras e histórico de envios',
            'Ranking com premiação, menção honrosa e PDF de resultados',
            'Linguagem inclusiva de gênero e validação de documento e telefone de várias nacionalidades'
          ]
        },
        {
          ano: '2026',
          titulo: 'PDIAP: Fase 7',
          rotulo: 'Fase 7 · Em andamento',
          periodo: 'setembro de 2026 a agosto de 2027',
          edital: 'Edital PROPESP 06/2026',
          mostra: 'XI MOVACI',
          emAndamento: true,
          coordenacao: ['Jean Marcos da Silva'],
          colaboracao: ['Geovane Griesang'],
          bolsistas: ['Biancca Machado Brauvers'],
          voluntarios: [],
          resumo: 'A fase atual prepara a plataforma para a XI MOVACI, em 2027, com foco em atualização tecnológica, mobilidade para quem avalia e documentação para as próximas equipes.',
          destaques: [
            'Atualização das ferramentas e bibliotecas usadas pela plataforma',
            'Avaliação dos trabalhos pelo celular, durante o evento',
            'Documentação técnica e manuais de uso atualizados'
          ]
        }
      ];

      // Nomes que o projeto teve e as vertentes que nasceram dele (seção "Um projeto, vários nomes").
      $scope.vertentes = [
        {
          nome: 'PDIAP',
          periodo: '2016 a 2019 e de 2023 em diante',
          texto: 'Plataforma Digital de Inscrição e Administração de Projetos. É o projeto principal: a plataforma que organiza a MOVACI, das inscrições aos certificados.'
        },
        {
          nome: 'IFIntegra',
          periodo: '2018 e 2019',
          texto: 'Vertente do PDIAP, registrada como projeto próprio, que integrou a plataforma à biblioteca digital de artigos do câmpus (IFPublica), para levar os trabalhos da mostra até ela sem cadastro manual.'
        },
        {
          nome: 'IFPublica',
          periodo: 'integrada de 2018 a 2020',
          texto: 'Biblioteca digital de artigos do câmpus. Recebeu, pelo IFIntegra e depois pelo PDIAPIA, a exportação dos dados dos trabalhos cadastrados na plataforma.'
        },
        {
          nome: 'PDIAPIA',
          periodo: '2020 a 2022',
          texto: 'Plataforma Digital de Inscrição, Administração de Projetos e Integração de Ambientes. Nome adotado quando PDIAP e IFIntegra se juntaram em um só projeto. Em 2023, o projeto voltou a se chamar PDIAP.'
        }
      ];

      $scope.publicacoes = [
        'GRIESANG, G.; ALGAYER, M. R. PDIAP: Plataforma Digital de Inscrição e Administração de Projetos. Revista Foco, v. 17, n. 12, p. 80-95, 2024.',
        'GRIESANG, G.; GIEHL, P. H.; ALGAYER, M. R. O uso da automação digital para agilizar processos e suprimir erros na execução de rotinas. In: Engenharia elétrica e de computação: docência, pesquisa e inovação tecnológica. Ponta Grossa: Atena, 2023. p. 73-79.',
        'GRIESANG, G.; GIEHL, P. H.; ALGAYER, M. R. The use of digital automation to speed up processes and suppress errors in the execution of routines. Scientific Journal of Applied Social and Clinical Science, v. 2, n. 17, 2022.'
      ];

      // Totais do topo: pessoas contadas uma vez só, mesmo que tenham participado de vários anos.
      // O sufixo entre parênteses - ex.: "(PDIAP)" - não faz parte do nome.
      var nome = function (n) { return n.replace(/\s*\(.*\)\s*$/, ''); };
      var unicos = function (campos) {
        var vistos = {};
        $scope.fases.forEach(function (f) {
          campos.forEach(function (c) { (f[c] || []).forEach(function (n) { vistos[nome(n)] = true; }); });
        });
        return Object.keys(vistos);
      };
      var estudantes = unicos(['bolsistas', 'voluntarios']);
      var servidores = unicos(['coordenacao', 'colaboracao']).filter(function (n) { return estudantes.indexOf(n) < 0; });

      $scope.totais = {
        anos: new Date().getFullYear() - 2016 + 1,
        projetos: $scope.fases.reduce(function (s, f) { return s + (f.projetos || 1); }, 0),
        estudantes: estudantes.length,
        servidores: servidores.length
      };
    });
})();
