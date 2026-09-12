# Próxima fase visual: clareza operacional

Esta revisão continua o redesign V3 do PR #8 e incorpora a correção das fixtures do PR #9. A direção é um painel de trabalho com superfícies neutras, navegação escura e azul nas ações, mantendo as rotas e os componentes existentes.

## Referências e aplicação

| Referência | Aplicação neste projeto |
| --- | --- |
| [Carbon: tabelas de dados](https://carbondesignsystem.com/components/data-table/usage/) | Títulos de coluna em leitura normal, texto legível, filtros agrupados e espaço para os dados. |
| [Atlassian: espaçamento](https://atlassian.design/foundations/spacing/) | Ritmo de 8, 16 e 24 px para agrupar controles e separar seções relacionadas. |

As referências orientam decisões; não adicionam dependências nem substituem a identidade do projeto.

## Alterações

- Fundo neutro, sombras leves e menos gradientes decorativos nos cartões. A navegação e a ação principal continuam destacadas.
- Escala de leitura: corpo e campos de entrada em 16 px, ações e informações recorrentes em 14 px, metadados em 12 px.
- Nomes de condomínios podem quebrar linha; cartões se reorganizam conforme o espaço disponível.
- Navegação mobile com rótulos de 12 px, quebra de linha e espaço inferior para o botão de criação rápida.
- Cores de atenção, risco e sucesso preservadas nas barras de indicadores. Confirmação destrutiva conserva a distinção visual vermelha.
- Foco de teclado explícito e respeito à preferência de redução de movimento.

Os refinamentos visuais usam os arquivos CSS existentes. A revisão adicional ajusta também a busca rápida e os menus mobile: foco contido na janela, retorno ao botão de origem, preservação dos elementos já inativos e bloqueio de busca sobre um cadastro em edição. Não há alteração de autenticação, permissões, consultas, persistência ou esquema do banco.

## Validação e continuidade

`tests/browser/design-harmony.spec.js` aplica a ordem completa dos estilos do `index.html` às fixtures comportamentais, sem gravar dados reais. Abrange 320, 390, 768 e 1440 px, nomes longos, rótulos do dock, busca, filtros combinados, recuperação sem resultados, criação no condomínio atual e cancelamento de confirmação.

As capturas ficam no artefato `visual-regression-evidence` da execução do GitHub Actions. Verificar o resultado da execução associada ao commit antes de integrar. As fixtures não equivalem a uma validação de todas as páginas autenticadas com dados reais.

Na próxima revisão visual com Thi, conferir especialmente a leitura de prazos, os nomes reais mais longos, a densidade das tabelas e a navegação no aparelho que ele utiliza. Manter a mesma escala ao evoluir calendário, documentos, financeiro e portal do morador. Mudanças na estrutura das telas devem vir acompanhadas de testes dos respectivos fluxos.

## Revisão adicional

- Busca e criação rápida com botão explícito de fechar, foco contido, retorno ao acionador, contagem anunciada e rolagem utilizável em telas baixas com texto ampliado.
- Menus Mais da gestão e do morador isolam o conteúdo de fundo enquanto estão abertos e restauram o foco ao fechar.
- Portal do morador com texto maior e contraste corrigido no item ativo da navegação escura.
- Indicadores mobile mais compactos; rótulos curtos no dock com o nome completo mantido no nome acessível e no título do link.
- Capturas reais de fixtures no Chromium inspecionadas para desktop, celular e busca. As primeiras capturas revelaram indicadores excessivamente altos e palavras cortadas no dock, corrigidos na revisão seguinte.

A cobertura adicional usa a cascata de produção para arquivos, assembleias, integrações e portal do morador, além de busca, filtros, foco e preservação de rascunhos. O teste de ampliação usa fonte raiz a 200% em 320 × 480 px; não simula o teclado virtual real de todos os aparelhos.

Os cenários são isolados e não gravam dados reais. A aprovação dos testes e a inspeção das capturas não comprovam todas as integrações externas ou todas as telas autenticadas em produção. Consultar o resultado do último commit no PR antes de integrar.
