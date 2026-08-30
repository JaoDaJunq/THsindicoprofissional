# Gestão Condominial — Portal do Síndico

Três shells: painel do síndico (multi-condomínio), portal do morador, admin do sistema.
`TODO.md` lista as telas — cada tela é uma tarefa, variações entram como sub-itens dela.
`.old/` é a implementação anterior, referência apenas: **não editar**.

Stack: Next.js 16 (App Router) · React 19 · HeroUI v3 · Tailwind 4 · Postgres 18 · Prisma 7 · Auth.js v5.
O padrão de camadas está em `docs/architecture.md` — leia antes de criar arquivo novo.

@.claude/rules/tdd.md
@.claude/rules/soft-delete.md

## Invariantes

- **Código em inglês**: identificadores, arquivos, pastas, comentários, testes, branches.
  **Exceções deliberadas**: texto exibido ao usuário e mensagens de commit são pt-BR,
  com acentuação correta e sem exceção.
- **Tudo tipado.** Sem `any`, sem retorno implícito. O ESLint trata os dois como erro.
- **Tipos compartilhados ficam em `shared/`** e nunca importam Prisma — senão o bundle
  do cliente carrega o ORM junto.
- **Testes ficam em `tests/`**, espelhando a árvore do código. Nunca ao lado do fonte.
- **Sem componentes server-side para dados.** Tela é `'use client'` e busca de `/api/*`.
- **Sempre UUID** como identificador, com tipo nativo `@db.Uuid`.
- **Botão de voltar ou cancelar é `variant="ghost"`**: sem borda, sem cor, sem peso.
  A ação principal é a única com cor.
- **Campo dentro de modal ou drawer é `variant="secondary"`**: o primário tem o
  mesmo fundo do overlay e some no modo escuro.
- **No telefone, botão nunca fica ao lado de botão**: um por linha. Lado a lado só
  a partir de `sm:`, e empilhado cada um ocupa a largura toda. Exceção: as ações dentro do painel do acordeão, que cabem
  as três na mesma linha.
- **O mínimo que resolve.** Sem abstração especulativa, sem dependência para o que cabe
  em poucas linhas.

## Rodar

```
docker compose up -d      # app em :3000, Postgres 18 em :5432
npm test                  # suíte + cobertura (gate de 95%, quebra o build)
npm run types             # tsc
npm run lint              # eslint
npm run db:migrate        # nova migração
```

O `.env` da raiz é o setup de dev. Fora do container o banco é `localhost`;
dentro do compose o host vira `db`.

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
