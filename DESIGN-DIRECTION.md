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

As alterações de produto se limitam aos dois arquivos CSS existentes. Não há alteração de autenticação, permissões, consultas, persistência ou esquema do banco.

## Validação e continuidade

`tests/browser/design-harmony.spec.js` aplica a ordem completa dos estilos do `index.html` às fixtures comportamentais, sem gravar dados reais. Abrange 320, 390, 768 e 1440 px, nomes longos, rótulos do dock, busca, filtros combinados, recuperação sem resultados, criação no condomínio atual e cancelamento de confirmação.

As capturas ficam no artefato `visual-regression-evidence` da execução do GitHub Actions. Verificar o resultado da execução associada ao commit antes de integrar. As fixtures não equivalem a uma validação de todas as páginas autenticadas com dados reais.

Na próxima revisão visual com Thi, conferir especialmente a leitura de prazos, os nomes reais mais longos, a densidade das tabelas e a navegação no aparelho que ele utiliza. Manter a mesma escala ao evoluir calendário, documentos, financeiro e portal do morador. Mudanças na estrutura das telas devem vir acompanhadas de testes dos respectivos fluxos.
