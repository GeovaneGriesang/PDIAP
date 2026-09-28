# Versões vendorizadas em public/bower_components

Bower foi removido como ferramenta do projeto em 2026-09-28 (etapa g) - registro estava
abandonado e não havia automação de instalação (ver memória `project-dependencias-
desatualizadas`). Esta pasta é commitada como está e atualizada manualmente, substituindo
cada pacote pelos arquivos de build de navegador já prontos baixados do npm (mesmos pacotes
também são publicados lá). `*.map` não é commitado (sem uso em produção).

| pacote | versão | atualizado em |
|---|---|---|
| angular | 1.8.3 | 2026-09-28 (etapa c) |
| angular-animate | 1.8.3 | 2026-09-28 (etapa c) |
| angular-aria | 1.8.3 | 2026-09-28 (etapa c) |
| angular-material | 1.2.5 | 2026-09-28 (etapa d) |
| angular-messages | 1.6.6 | 2026-09-27 (baseline, não usado - nenhum `<script>` carrega este pacote) |
| angular-resource | 1.8.3 | 2026-09-28 (etapa c) |
| angular-sanitize | 1.8.3 | 2026-09-28 (etapa c) |
| angular-ui-router | 1.1.2 | 2026-09-28 (etapa e) |
| ng-file-upload | 12.2.13 | 2026-09-28 (etapa c) |
| pdfmake | 0.1.72 | 2026-09-28 (etapa f) |

Histórico de versão de cada pacote fica no `git log -- public/bower_components/<pacote>`.
