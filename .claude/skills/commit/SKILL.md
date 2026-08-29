---
name: commit
description: Cria commits neste projeto no padrão semântico em pt-BR, sem trailer de coautoria. Use sempre que for commitar, quando o usuário disser "commita", "faz o commit", "sobe isso" ou invocar /commit.
---

# Commit

Padrão obrigatório deste projeto. O hook `.claude/hooks/bash/commit.js` bloqueia
o `git commit` que sair da regra — a skill existe para acertar de primeira.

## Regras

1. **Nunca** incluir `Co-Authored-By:` nem `Generated with Claude Code`.
2. Assunto semântico: `tipo(escopo): descrição`, tudo em pt-BR.
3. Tipos válidos: `feat`, `fix`, `docs`, `estilo`, `refatora`, `perf`, `teste`, `build`, `ci`, `tarefa`, `reverte`.
4. Escopo é a tela ou o módulo tocado — `morador`, `sindico`, `admin`, `auth`, `calendario`, `gas`, `arquivos`… Omita se o commit atravessa tudo.
5. Descrição no imperativo, minúscula, sem ponto final, até ~72 caracteres.
6. Corpo só quando o "porquê" não couber no assunto. Também em pt-BR.
7. Nunca em inglês — nem assunto, nem corpo, nem nome de branch.

```
feat(morador): abre chamado direto pelo card do início
fix(gas): corrige cálculo do vencimento da válvula
refatora(auth): unifica cadastro de pessoa e concessão de papel
docs: registra as telas órfãs no TODO
```

## Fluxo

1. `git status` e `git diff` (ou `git diff --staged`) para ver o que entra.
2. `git log --oneline -8` para casar o estilo dos commits anteriores.
3. Se estiver na `main`, criar branch antes — `git switch -c tipo/descricao-curta`.
4. `git add` só do que pertence ao commit. Um commit por assunto.
5. Commitar. Se o hook bloquear, corrigir a mensagem, não contornar o hook.
6. Não fazer `push` sem o usuário pedir.

## Ao terminar uma tela

Se o commit conclui um item do `TODO.md`, marcar o checkbox no mesmo commit.
