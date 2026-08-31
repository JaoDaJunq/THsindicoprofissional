# Papéis e escopo por condomínio

Data: 2026-08-30 · Estado: proposto

## Problema

`User.isManager` é um booleano: quem o tem administra **tudo**, em qualquer
condomínio. Não existe administrador do sistema separado do síndico, e o
`CondominiumMember.role` criado com o vínculo n↔n é hoje uma etiqueta sem
efeito — parece dar poder e não dá.

Toda tela que vier depois (chamados, manutenções, documentos, assembleias) lê e
escreve dados de um condomínio. Sem escopo, cada uma dessas telas nasce aberta e
precisa ser fechada depois, uma a uma.

## Decisões

| Questão | Decisão |
|---|---|
| Papéis | Três, globais: `ADMIN`, `MANAGER`, `RESIDENT` |
| Papel do vínculo | Continua. O global manda, o do vínculo refina |
| Alcance do síndico | Só o que é dele — o resto não aparece nem na listagem |
| Quem cria condomínio | Só o admin. O síndico gere as pessoas dos condomínios dele |
| Quem edita papel | Só o admin, na tela de detalhe da pessoa |
| Dados atuais | `isManager=true → MANAGER`, resto `RESIDENT`, `admin@local → ADMIN` |

Ser `MANAGER` global é poder *ser* síndico; o vínculo com `role: MANAGER` diz
*onde*. Um `MANAGER` sem vínculo nenhum não administra coisa alguma, e a mesma
pessoa pode ser síndica do Aurora e moradora do Vale Verde.

## Modelo

```prisma
enum UserRole { ADMIN MANAGER RESIDENT }

model User {
  role UserRole @default(RESIDENT)
  // isManager sai
}
```

Migração, nesta ordem, para não perder o que existe:

1. `ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'RESIDENT'`
2. `UPDATE "User" SET "role" = 'MANAGER' WHERE "isManager"`
3. `UPDATE "User" SET "role" = 'ADMIN' WHERE "username" = 'admin'`
4. `DROP COLUMN "isManager"`

`prisma/seed.ts` passa a criar o usuário semente com `role: 'ADMIN'`.

## Autorização

Funções puras em `domain/authorization.ts` — sem Prisma, sem HTTP, testáveis
sozinhas:

```ts
isAdmin(user): boolean
administers(user, memberships, condominiumId): boolean
```

`administers` é verdadeiro para todo `ADMIN`, e para o `MANAGER` que tenha
vínculo ativo com `role: MANAGER` naquele condomínio. Para `RESIDENT`, nunca.

`app/api/session.ts` ganha `requireManagerOf(condominiumId)` ao lado do
`requireManager()` atual. Nenhuma rota decide sozinha: ela pergunta.

## Escopo nas leituras

O filtro nasce no repositório, como manda a regra de exclusão lógica — quem
chama não pode ter de lembrar.

- `listCondominiums` recebe quem está pedindo. `ADMIN` sem restrição; os demais
  só onde **administram** — vínculo ativo com `role: MANAGER`
  (`members: { some: { userId, role: 'MANAGER', deletedAt: null } }`).
  Vínculo de morador não abre o painel: a pessoa que mora no Vale Verde e é
  síndica do Aurora administra o Aurora e nada mais. O Vale Verde dela é assunto
  do portal do morador, que ainda não existe.
- `findById` aplica o mesmo escopo: sem isso a URL direta contorna a listagem.
- A listagem de **pessoas** segue a mesma regra: o síndico vê quem está nos
  condomínios dele; o admin vê todos.

`RESIDENT` não acessa o painel: as rotas administrativas respondem 403.

## Telas

- **`/users`** — a coluna "Síndico" vira "Papel"; o filtro booleano vira filtro
  por papel.
- **`/users/[id]`** — a seção *Permissões* troca o `Switch` de síndico por um
  seletor dos três papéis. **Só o admin** o enxerga habilitado; para o síndico
  ele aparece somente-leitura. Um síndico não se promove nem promove ninguém.
- **`/condominiums`** — "Novo condomínio" só para admin. O síndico vê apenas os
  seus, e o `MembershipEditor` continua disponível dentro deles.
- **Navegação** — o `RESIDENT` não vê os itens do painel.

O item "toggle de síndico direto na linha" do `TODO.md` fica **cancelado**:
permissão não se troca com um clique de passagem numa listagem.

## O que fica de fora

- **Portal do morador.** Não foi reescrito. Enquanto não existir, o `RESIDENT`
  que entrar recebe uma tela de "sem acesso" — melhor do que fingir que a área
  administrativa é dele. Quando o portal existir, ele passa a cair lá.
- **Unidades como entidade.** Continua no `TODO.md`, sem relação com esta spec.

## Testes

- `domain/authorization.ts`: testes puros, uma regra por teste.
- Use cases com escopo: contra os repositórios em memória.
- Integração, no Postgres: o síndico do Aurora não recebe o Vale Verde — nem na
  listagem, nem pelo id — e o admin recebe os dois.
- As rotas seguem sem teste, como os demais compositores em `app/api/**`.
