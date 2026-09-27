# Versões vendorizadas em public/bower_components

Bower está sendo aposentado como ferramenta (registro abandonado, sem automação de
instalação no projeto - ver memória `project-dependencias-desatualizadas`). Esta pasta
passou a ser commitada como está e atualizada manualmente, substituindo cada pacote pelos
arquivos de build de navegador já prontos baixados do npm (mesmos pacotes também são
publicados lá). `*.map` não é commitado (sem uso em produção).

| pacote | versão | congelado em |
|---|---|---|
| angular | 1.5.8 | 2026-09-27 (baseline) |
| angular-animate | 1.6.6 | 2026-09-27 (baseline) |
| angular-aria | 1.6.6 | 2026-09-27 (baseline) |
| angular-material | 1.0.9 | 2026-09-27 (baseline) |
| angular-messages | 1.6.6 | 2026-09-27 (baseline) |
| angular-resource | 1.5.8 | 2026-09-27 (baseline) |
| angular-sanitize | 1.5.8 | 2026-09-27 (baseline) |
| angular-ui-router | 0.3.1 | 2026-09-27 (baseline) |
| ng-file-upload | 12.2.9 | 2026-09-27 (baseline) |
| pdfmake | 0.1.20 | 2026-09-27 (baseline) |

Histórico de versão de cada pacote fica no `git log -- public/bower_components/<pacote>`.
