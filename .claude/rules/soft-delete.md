# Regra: soft delete em todas as models

Nenhum registro é apagado do banco. **Nunca.** Não existe `DELETE`, não existe
`prisma.x.delete()`, não existe `deleteMany`. Se você está prestes a escrever um,
está errado — pare e use soft delete.

## Como toda model nasce

Toda model do `schema.prisma` tem, sem exceção:

```prisma
deletedAt DateTime? @db.Timestamptz

@@index([deletedAt])
```

`deletedAt = null` significa ativo. Preenchido significa excluído, com a data.

## Como se exclui

Excluir é atualizar:

```ts
await repository.softDelete(id) // update { deletedAt: new Date() }
```

## Como se lê

**Toda leitura filtra `deletedAt: null` por padrão.** Um registro excluído não
aparece em listagem, busca, contagem ou relação — a menos que quem chamou tenha
pedido explicitamente os excluídos.

O filtro é responsabilidade do repositório, não de quem chama. Se cada caso de
uso precisar lembrar de filtrar, um dia alguém esquece e o registro excluído
reaparece na tela.

## Unicidade

Índice único simples quebra com soft delete: o e-mail de um usuário excluído
bloqueia o cadastro de um novo com o mesmo e-mail. Use índice parcial:

```sql
CREATE UNIQUE INDEX "User_email_active_key"
  ON "User" ("email") WHERE "deletedAt" IS NULL;
```

## Por quê

Condomínio é domínio com histórico e responsabilidade legal: chamado, assembleia,
documento e morador precisam continuar rastreáveis depois de removidos da vista.
Apagar de verdade destrói auditoria que não volta.
