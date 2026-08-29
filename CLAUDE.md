# Gestão Condominial — Portal do Síndico

Três shells: painel do síndico (multi-condomínio), portal do morador, admin do sistema.
`TODO.md` lista as telas — cada tela é uma tarefa, variações entram como sub-itens dela.
`.old/` é a implementação anterior, referência apenas: **não editar**.

@.claude/rules/tdd.md

## Invariantes

- **pt-BR em tudo**: código, identificadores, comentários, interface, documentação, branches. Nada em inglês além de palavras reservadas e APIs de terceiros.
- **O mínimo que resolve.** Sem abstração especulativa, sem dependência para o que cabe em poucas linhas.

## Este arquivo

Só o que não é carregado de outro jeito. Skills, hooks e rules já chegam sozinhos —
repetir o conteúdo deles aqui é token gasto em toda conversa. Antes de escrever algo
neste arquivo, verificar se já existe em `.claude/`; se existir, não escrever.

## Onde registrar um pedido permanente

Quando o pedido é uma regra e não uma correção pontual, registrar e dizer onde ficou:

| O pedido é… | Vai para |
|---|---|
| Invariante do projeto, vale sempre | seção acima |
| Processo inegociável, com passos | `.claude/rules/`, importado com `@` |
| Procedimento de algumas tarefas | `.claude/skills/<nome>/SKILL.md` |
| Precisa acontecer automaticamente num evento | hook em `.claude/settings.json` |
| Trabalho longo e isolado | `.claude/agents/<nome>.md` |

Se depende de eu lembrar, é rule ou skill. Se **não pode** depender, é hook.
