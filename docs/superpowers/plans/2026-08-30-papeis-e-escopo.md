# Papéis e escopo por condomínio — plano de implementação

> **Para quem executa:** use `superpowers:subagent-driven-development` ou
> `superpowers:executing-plans` para tocar tarefa a tarefa. Os passos usam
> caixinhas (`- [ ]`) para acompanhamento.

**Objetivo:** trocar o booleano `User.isManager` por três papéis globais
(`ADMIN`, `MANAGER`, `RESIDENT`) e fazer o síndico enxergar apenas os
condomínios que administra.

**Arquitetura:** o papel global diz *o que* a pessoa pode; o vínculo
`CondominiumMember` com `role: MANAGER` diz *onde*. A decisão vive em funções
puras em `domain/authorization.ts`; o recorte das listagens nasce no
repositório, como a regra de exclusão lógica, para que nenhum chamador precise
lembrar dele.

**Stack:** Next.js 16 (App Router) · React 19 · HeroUI v3 · Prisma 7 ·
Postgres 18 · Auth.js v5 · Vitest.

**Spec:** `docs/superpowers/specs/2026-08-30-papeis-e-escopo-design.md`

## Restrições globais

- **TDD sem exceção** (`.claude/rules/tdd.md`): teste primeiro, ver falhar pela
  asserção, implementar o mínimo, ver passar, refatorar, ver passar de novo.
  Colar a saída em cada etapa.
- **Nada é apagado** (`.claude/rules/soft-delete.md`): sem `delete`, e toda
  leitura filtra `deletedAt: null` dentro do repositório.
- **Código em inglês**; texto de tela e mensagem de commit em pt-BR, acentuados.
- **Tudo tipado**: `any` e retorno implícito são erro de ESLint.
- **Testes em `tests/`**, espelhando a árvore. Nunca ao lado do fonte.
- **Cobertura mínima de 95%** — `npm test` quebra abaixo disso.
- **Campo dentro de `Surface` é `variant="secondary"`**; cancelar é
  `variant="ghost"`; no telefone, um botão por linha.
- `app/api/**` fica fora da cobertura: são compositores, não levam teste.
- Ao terminar, **reiniciar o app** (`docker compose restart app`) sempre que o
  schema mudar — o cliente Prisma fica preso em `globalThis` e o processo antigo
  não enxerga modelo novo.

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `shared/types/user.ts` | `UserRole` e o campo `role` no lugar de `isManager` |
| `prisma/schema.prisma` | enum `UserRole`, coluna `role` |
| `prisma/migrations/<ts>_user_role/migration.sql` | converte e derruba `isManager` |
| `domain/authorization.ts` | **novo** — `isAdmin`, `administers` |
| `domain/repositories/condominium-repository.ts` | assinaturas com `CondominiumScope` |
| `domain/repositories/user-repository.ts` | assinatura de `list` com `UserScope` |
| `infrastructure/repositories/prisma-*.ts` | traduz o escopo em `where` |
| `app/api/session.ts` | `requireAdmin`, `requireManagerOf`, `managedCondominiumIds` |
| `components/user/role-chip.tsx` | **novo** — o papel como rótulo na listagem |
| `app/(app)/users/[id]/page.tsx` | seletor de papel, habilitado só para admin |

---

### Tarefa 1: `UserRole` no lugar de `isManager`

**Arquivos:**
- Modificar: `shared/types/user.ts`, `prisma/schema.prisma`,
  `infrastructure/repositories/prisma-user-repository.ts`,
  `infrastructure/http/user-query.ts`, `prisma/seed.ts`,
  `tests/support/build-user.ts`, `tests/support/in-memory-user-repository.ts`
- Criar: `prisma/migrations/<timestamp>_user_role/migration.sql`
- Testar: `tests/infrastructure/repositories/prisma-user-repository.test.ts`,
  `tests/infrastructure/http/user-query.test.ts`

**Interfaces:**
- Produz:
  ```ts
  export type UserRole = 'ADMIN' | 'MANAGER' | 'RESIDENT'
  export interface User { /* … */ role: UserRole }        // isManager sai
  export interface UpdateUserInput { name?: string | null; email?: string; image?: string | null; role?: UserRole }
  export interface UserFilters { search?: string; id?: string; name?: string; email?: string; role?: UserRole; status?: UserStatus }
  ```

- [ ] **Passo 1: escrever os testes que falham**

Em `tests/infrastructure/http/user-query.test.ts`, trocar os dois testes da flag
`isManager` por:

```ts
it('lê o papel pedido no filtro', () => {
  expect(parse('?role=MANAGER').filters.role).toBe('MANAGER')
})

it('descarta um papel que não existe', () => {
  expect(parse('?role=CHEFE').filters.role).toBeUndefined()
})
```

Em `tests/infrastructure/repositories/prisma-user-repository.test.ts`, trocar o
teste que filtra por `isManager` por:

```ts
it('filtra a listagem pelo papel', async () => {
  const spy = delegate()

  await new PrismaUserRepository(spy).list({ role: 'ADMIN' }, { page: 1, pageSize: 10 })

  expect(spy.findMany).toHaveBeenCalledWith(
    expect.objectContaining({ where: expect.objectContaining({ role: 'ADMIN' }) }),
  )
})
```

- [ ] **Passo 2: rodar e ver falhar**

Rodar: `npx vitest run tests/infrastructure`
Esperado: FALHA nas asserções acima (`role` não existe em `UserFilters`).

- [ ] **Passo 3: mudar o schema e escrever a migração**

Em `prisma/schema.prisma`, dentro de `model User`, trocar
`isManager Boolean @default(false)` por `role UserRole @default(RESIDENT)` e
acrescentar, fora do modelo:

```prisma
/** What the person can do system-wide. Where they do it comes from the membership. */
enum UserRole {
  ADMIN
  MANAGER
  RESIDENT
}
```

Gerar o arquivo da migração sem aplicar (o `migrate dev` é interativo e recusa
rodar aqui):

```bash
set -a; . ./.env; set +a
DIR=prisma/migrations/$(date +%Y%m%d%H%M%S)_user_role
mkdir -p "$DIR"
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script \
  | grep -v '^Loaded Prisma config' > "$DIR/migration.sql"
echo "$DIR/migration.sql"
```

Abrir o arquivo gerado. Ele vai criar o enum, **adicionar** `role` e **derrubar**
`isManager` — nessa ordem, o dado se perde. Editar para converter no meio:

```sql
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER', 'RESIDENT');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'RESIDENT';

-- Convert before dropping: the boolean is the only record of who managed.
UPDATE "User" SET "role" = 'MANAGER' WHERE "isManager";
UPDATE "User" SET "role" = 'ADMIN' WHERE "username" = 'admin';

ALTER TABLE "User" DROP COLUMN "isManager";
```

Aplicar nos dois bancos e regerar o cliente:

```bash
set -a; . ./.env; set +a
npx prisma migrate deploy
DATABASE_URL=$DATABASE_URL_TEST npx prisma migrate deploy
npx prisma generate
```

- [ ] **Passo 4: acompanhar os tipos e o resto**

`shared/types/user.ts` — o bloco de interfaces da seção **Interfaces** acima.

`infrastructure/repositories/prisma-user-repository.ts`: em `UserWhere`, trocar
`isManager?: boolean` por `role?: UserRole`; em `USER_FIELDS`, trocar
`isManager: true` por `role: true`; em `buildWhere`, trocar o bloco da flag por:

```ts
if (filters.role) where.role = filters.role
```

`infrastructure/http/user-query.ts`: apagar `readFlag` e a leitura de
`isManager`, e acrescentar:

```ts
const role = params.get('role')
if (role === 'ADMIN' || role === 'MANAGER' || role === 'RESIDENT') {
  filters.role = role satisfies UserRole
}
```

`tests/support/build-user.ts`: `isManager: false` vira `role: 'RESIDENT'`.

`tests/support/in-memory-user-repository.ts`: no `create`, `role: 'RESIDENT'`;
no `update`, `role: input.role ?? current.role`; no `list`, trocar a comparação
da flag por `if (filters.role && user.role !== filters.role) return false`.

`prisma/seed.ts`: `isManager: true` vira `role: 'ADMIN'`.

- [ ] **Passo 5: rodar e ver passar**

Rodar: `npx vitest run tests/infrastructure tests/application`
Esperado: PASSA. `npm run types` ainda acusa as telas — é a tarefa 6.

- [ ] **Passo 6: commitar**

```bash
git add -A
git commit -m "refatora(auth): troca a flag de síndico por três papéis"
```

---

### Tarefa 2: as regras de quem pode o quê

**Arquivos:**
- Criar: `domain/authorization.ts`
- Testar: `tests/domain/authorization.test.ts`

**Interfaces:**
- Consome: `UserRole` da tarefa 1; `Membership` de `shared/types/membership.ts`.
- Produz:
  ```ts
  export function isAdmin(user: User): boolean
  export function administers(
    user: User,
    memberships: readonly Membership[],
    condominiumId: CondominiumId,
  ): boolean
  ```

- [ ] **Passo 1: escrever o teste que falha**

```ts
import { administers, isAdmin } from '@/domain/authorization'
import { buildUser } from '@/tests/support/build-user'
import type { Membership } from '@/shared/types'

const admin = buildUser({ role: 'ADMIN' })
const manager = buildUser({ id: 'u1', role: 'MANAGER' })
const resident = buildUser({ id: 'u2', role: 'RESIDENT' })

function membership(role: Membership['role'], condominiumId = 'c1'): Membership {
  return {
    id: 'm1',
    role,
    user: { id: 'u1', name: 'Ana', email: 'ana@example.com' },
    condominium: { id: condominiumId, name: 'Aurora' },
  }
}

describe('isAdmin', () => {
  it('reconhece o administrador do sistema', () => {
    expect(isAdmin(admin)).toBe(true)
  })

  it('não confunde síndico com administrador', () => {
    expect(isAdmin(manager)).toBe(false)
  })
})

describe('administers', () => {
  it('deixa o administrador em qualquer condomínio', () => {
    expect(administers(admin, [], 'c1')).toBe(true)
  })

  it('deixa o síndico onde o vínculo diz que ele é síndico', () => {
    expect(administers(manager, [membership('MANAGER')], 'c1')).toBe(true)
  })

  it('barra o síndico no condomínio onde ele apenas mora', () => {
    expect(administers(manager, [membership('RESIDENT')], 'c1')).toBe(false)
  })

  it('barra o síndico em condomínio de que ele não participa', () => {
    expect(administers(manager, [membership('MANAGER', 'outro')], 'c1')).toBe(false)
  })

  it('barra o morador mesmo com vínculo de síndico', () => {
    expect(administers(resident, [membership('MANAGER')], 'c1')).toBe(false)
  })
})
```

- [ ] **Passo 2: rodar e ver falhar**

Rodar: `npx vitest run tests/domain/authorization.test.ts`
Esperado: FALHA — o módulo não existe.

- [ ] **Passo 3: implementar**

```ts
import type { CondominiumId, Membership, User } from '@/shared/types'

/** Runs the whole system: every condominium, every person. */
export function isAdmin(user: User): boolean {
  return user.role === 'ADMIN'
}

/**
 * The global role says what the person may do; the membership says where.
 * A MANAGER only manages the condominiums whose link says MANAGER.
 */
export function administers(
  user: User,
  memberships: readonly Membership[],
  condominiumId: CondominiumId,
): boolean {
  if (isAdmin(user)) return true
  if (user.role !== 'MANAGER') return false

  return memberships.some(
    (membership) =>
      membership.condominium.id === condominiumId && membership.role === 'MANAGER',
  )
}
```

- [ ] **Passo 4: rodar e ver passar**

Rodar: `npx vitest run tests/domain/authorization.test.ts` — PASSA.

- [ ] **Passo 5: commitar**

```bash
git add domain/authorization.ts tests/domain/authorization.test.ts
git commit -m "feat(auth): decide em um lugar só quem administra qual condomínio"
```

---

### Tarefa 3: o condomínio alheio some da consulta

**Arquivos:**
- Modificar: `domain/repositories/condominium-repository.ts`,
  `infrastructure/repositories/prisma-condominium-repository.ts`,
  `application/use-cases/list-condominiums.ts`,
  `tests/support/in-memory-condominium-repository.ts`
- Testar: `tests/infrastructure/repositories/prisma-condominium-repository.test.ts`,
  `tests/application/use-cases/list-condominiums.test.ts`

**Interfaces:**
- Produz:
  ```ts
  /** Null sees everything — that is the admin. */
  export type CondominiumScope = { managedBy: UserId } | null

  findById(id: CondominiumId, scope: CondominiumScope): Promise<Condominium | null>
  list(filters: CondominiumFilters, page: PageRequest, scope: CondominiumScope): Promise<Page<Condominium>>
  listCondominiums(repository, filters, page, scope): Promise<Result<Page<Condominium>, ListCondominiumsError>>
  ```
  `findByCnpj`, `create`, `update`, `softDelete` e `restore` **não** mudam de
  assinatura: quem chega neles já passou pela checagem da rota.

- [ ] **Passo 1: escrever os testes que falham**

Em `tests/infrastructure/repositories/prisma-condominium-repository.test.ts`:

```ts
it('mostra todos os condomínios a quem não tem escopo', async () => {
  const spy = delegate()

  await repository(spy).list({}, { page: 1, pageSize: 10 }, null)

  expect(vi.mocked(spy.findMany).mock.calls[0]?.[0].where.members).toBeUndefined()
})

it('mostra ao síndico apenas o que ele administra', async () => {
  const spy = delegate()

  await repository(spy).list({}, { page: 1, pageSize: 10 }, { managedBy: 'u1' })

  expect(vi.mocked(spy.findMany).mock.calls[0]?.[0].where.members).toEqual({
    some: { userId: 'u1', role: 'MANAGER', deletedAt: null },
  })
})

it('não entrega pelo id o condomínio fora do escopo', async () => {
  const spy = delegate()

  await repository(spy).findById(stored.id, { managedBy: 'u1' })

  expect(spy.findFirst).toHaveBeenCalledWith(
    expect.objectContaining({
      where: expect.objectContaining({
        members: { some: { userId: 'u1', role: 'MANAGER', deletedAt: null } },
      }),
    }),
  )
})
```

Em `tests/application/use-cases/list-condominiums.test.ts`, acrescentar:

```ts
it('repassa o escopo de quem pediu para o repositório', async () => {
  const repository = new InMemoryCondominiumRepository()
  const { id } = await repository.create({ name: 'Aurora', address: 'Rua A' })
  await repository.linkManager('u1', id)

  const outro = await listCondominiums(repository, {}, page, { managedBy: 'u2' })

  expect(outro.ok && outro.value.total).toBe(0)
})
```

- [ ] **Passo 2: rodar e ver falhar**

Rodar: `npx vitest run tests/infrastructure/repositories/prisma-condominium-repository.test.ts tests/application/use-cases/list-condominiums.test.ts`
Esperado: FALHA — `list` ainda recebe dois argumentos.

- [ ] **Passo 3: implementar**

Em `domain/repositories/condominium-repository.ts`, acrescentar o tipo e as duas
assinaturas da seção **Interfaces**.

Em `infrastructure/repositories/prisma-condominium-repository.ts`:

```ts
interface MemberFilter {
  some: { userId: UserId; role: 'MANAGER'; deletedAt: null }
}

// dentro de CondominiumWhere
members?: MemberFilter

/** The admin has no scope; everyone else sees only what they manage. */
function scopeOf(scope: CondominiumScope): { members?: MemberFilter } {
  if (!scope) return {}
  return { members: { some: { userId: scope.managedBy, role: 'MANAGER', deletedAt: null } } }
}
```

`findById` passa a montar `{ id, deletedAt: null, ...scopeOf(scope) }`, e
`buildWhere(filters, scope)` acrescenta `...scopeOf(scope)` ao devolver.

Em `application/use-cases/list-condominiums.ts`, acrescentar o quarto parâmetro
`scope: CondominiumScope` e repassá-lo a `repository.list`.

No dublê `tests/support/in-memory-condominium-repository.ts`, guardar os
vínculos de síndico num `Map<CondominiumId, Set<UserId>>` e acrescentar o método
de apoio usado pelo teste:

```ts
/** Test helper: says that this person manages this condominium. */
linkManager(userId: UserId, condominiumId: CondominiumId): void {
  const managers = this.managers.get(condominiumId) ?? new Set<UserId>()
  managers.add(userId)
  this.managers.set(condominiumId, managers)
}
```

e filtrar em `list`/`findById`: com `scope` preenchido, só passa o condomínio
cujo conjunto contém `scope.managedBy`.

- [ ] **Passo 4: rodar e ver passar**

Rodar: `npx vitest run tests/infrastructure tests/application` — PASSA.

- [ ] **Passo 5: commitar**

```bash
git add -A
git commit -m "feat(condominio): esconde da consulta o condomínio que não é do síndico"
```

---

### Tarefa 4: as rotas perguntam antes de responder

**Arquivos:**
- Modificar: `app/api/session.ts`, `app/api/condominiums/route.ts`,
  `app/api/condominiums/[id]/route.ts`,
  `app/api/condominiums/[id]/restore/route.ts`, `app/api/memberships/route.ts`
- Sem teste próprio: `app/api/**` são compositores (ver `docs/architecture.md`).
  A tarefa 7 os cobre de ponta a ponta.

**Interfaces:**
- Produz, em `app/api/session.ts`:
  ```ts
  export async function requireAdmin(): Promise<User | null>
  export async function requireManagerOf(condominiumId: CondominiumId): Promise<User | null>
  export async function scopeOf(user: User): Promise<CondominiumScope>
  export async function managedCondominiumIds(user: User): Promise<CondominiumId[]>
  ```

- [ ] **Passo 1: escrever os ajudantes de sessão**

```ts
import { administers, isAdmin } from '@/domain/authorization'
import { getMembershipRepository } from '@/infrastructure/repositories'
import type { CondominiumScope } from '@/domain/repositories/condominium-repository'
import type { CondominiumId, User } from '@/shared/types'

/** Only the system administrator. */
export async function requireAdmin(): Promise<User | null> {
  const user = await requester()
  return user && isAdmin(user) ? user : null
}

/** The admin, or the manager of this very condominium. */
export async function requireManagerOf(condominiumId: CondominiumId): Promise<User | null> {
  const user = await requester()
  if (!user) return null

  const memberships = await getMembershipRepository().list({ userId: user.id })
  return administers(user, memberships, condominiumId) ? user : null
}

/** What this person is allowed to see. The admin sees everything. */
export async function scopeOf(user: User): Promise<CondominiumScope> {
  return isAdmin(user) ? null : { managedBy: user.id }
}

/** The condominiums this person manages, to scope other listings by. */
export async function managedCondominiumIds(user: User): Promise<CondominiumId[]> {
  const memberships = await getMembershipRepository().list({ userId: user.id })
  return memberships
    .filter((membership) => membership.role === 'MANAGER')
    .map((membership) => membership.condominium.id)
}
```

- [ ] **Passo 2: ligar as rotas**

- `GET /api/condominiums` e `GET /api/users`: o `RESIDENT` recebe 403 — a spec
  fecha o painel para ele, e devolver lista vazia mentiria dizendo que ele está
  no lugar certo e não há nada lá. Para os demais, `scopeOf(user)` e repassar a
  `listCondominiums(repo, filters, page, scope)`:

  ```ts
  const user = await requester()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (user.role === 'RESIDENT') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  ```
- `POST /api/condominiums`: `requireAdmin()` em vez de `requireManager()` — só o
  admin cria condomínio.
- `PATCH` e `DELETE /api/condominiums/[id]` e `POST .../restore`:
  `requireManagerOf(id)`.
- `POST`, `PATCH` e `DELETE /api/memberships`: `requireManagerOf(condominiumId)`
  lendo o condomínio do corpo (POST/PATCH) ou da query (DELETE).
- `GET /api/memberships`: quem não administra aquele condomínio recebe 403.

- [ ] **Passo 3: conferir que nada quebrou**

Rodar: `npm run types` e `npm test`.
Esperado: tipos limpos; a suíte segue verde (as rotas não têm teste próprio).

- [ ] **Passo 4: commitar**

```bash
git add app/api
git commit -m "feat(auth): exige administrador para criar condomínio e síndico do próprio"
```

---

### Tarefa 5: a listagem de pessoas também respeita o escopo

**Arquivos:**
- Modificar: `domain/repositories/user-repository.ts`,
  `infrastructure/repositories/prisma-user-repository.ts`,
  `application/use-cases/list-users.ts`, `app/api/users/route.ts`,
  `tests/support/in-memory-user-repository.ts`
- Testar: `tests/infrastructure/repositories/prisma-user-repository.test.ts`,
  `tests/application/use-cases/list-users.test.ts`

**Interfaces:**
- Produz:
  ```ts
  /** Null sees everyone — that is the admin. */
  export type UserScope = { inCondominiums: readonly CondominiumId[] } | null

  list(filters: UserFilters, page: PageRequest, scope: UserScope): Promise<Page<User>>
  listUsers(repository, filters, page, scope): Promise<Result<Page<User>, ListUsersError>>
  ```

- [ ] **Passo 1: escrever os testes que falham**

```ts
it('mostra todas as pessoas a quem não tem escopo', async () => {
  const spy = delegate()

  await new PrismaUserRepository(spy).list({}, { page: 1, pageSize: 10 }, null)

  expect(vi.mocked(spy.findMany).mock.calls[0]?.[0].where.memberships).toBeUndefined()
})

it('mostra ao síndico apenas quem está nos condomínios dele', async () => {
  const spy = delegate()

  await new PrismaUserRepository(spy).list({}, { page: 1, pageSize: 10 }, {
    inCondominiums: ['c1'],
  })

  expect(vi.mocked(spy.findMany).mock.calls[0]?.[0].where.memberships).toEqual({
    some: { condominiumId: { in: ['c1'] }, deletedAt: null },
  })
})

it('não mostra ninguém ao síndico sem condomínio', async () => {
  const spy = delegate()

  await new PrismaUserRepository(spy).list({}, { page: 1, pageSize: 10 }, {
    inCondominiums: [],
  })

  expect(vi.mocked(spy.findMany).mock.calls[0]?.[0].where.memberships).toEqual({
    some: { condominiumId: { in: [] }, deletedAt: null },
  })
})
```

- [ ] **Passo 2: rodar e ver falhar**

Rodar: `npx vitest run tests/infrastructure/repositories/prisma-user-repository.test.ts`
Esperado: FALHA — `list` recebe dois argumentos.

- [ ] **Passo 3: implementar**

Em `UserWhere`, acrescentar:

```ts
memberships?: { some: { condominiumId: { in: readonly CondominiumId[] }; deletedAt: null } }
```

e em `buildWhere(filters, scope)`:

```ts
if (scope) {
  where.memberships = { some: { condominiumId: { in: scope.inCondominiums }, deletedAt: null } }
}
```

`listUsers` ganha o quarto parâmetro e repassa. Em `app/api/users/route.ts`:

```ts
const scope = isAdmin(user) ? null : { inCondominiums: await managedCondominiumIds(user) }
```

No dublê, filtrar por um `Map<UserId, Set<CondominiumId>>` alimentado por um
`linkTo(userId, condominiumId)` de apoio, no mesmo espírito do `linkManager` da
tarefa 3.

- [ ] **Passo 4: rodar e ver passar**

Rodar: `npx vitest run tests/infrastructure tests/application` — PASSA.

- [ ] **Passo 5: commitar**

```bash
git add -A
git commit -m "feat(usuario): mostra ao síndico só as pessoas dos condomínios dele"
```

---

### Tarefa 6: as telas falam de papel, e só o admin muda

**Arquivos:**
- Criar: `components/user/role-chip.tsx`, `tests/components/user/role-chip.test.tsx`
- Modificar: `components/user/list/desktop.tsx`, `components/user/list/mobile.tsx`,
  `components/user/filters-dialog.tsx`, `hooks/use-users.ts`,
  `app/(app)/users/[id]/page.tsx`, `app/(app)/condominiums/page.tsx`,
  `components/layout/nav-desktop.tsx`, `components/layout/account/card.tsx`
- Testar: os testes espelho de cada um deles

**Interfaces:**
- Consome: `UserRole` (tarefa 1), `isAdmin` (tarefa 2).
- Produz: `ROLE_LABEL: Record<UserRole, string>` exportado de
  `components/user/role-chip.tsx`, reusado pela listagem e pelo filtro.

- [ ] **Passo 1: escrever os testes que falham**

```ts
// tests/components/user/role-chip.test.tsx
import { render, screen } from '@testing-library/react'
import { RoleChip } from '@/components/user/role-chip'

describe('RoleChip', () => {
  it('nomeia o administrador do sistema', () => {
    render(<RoleChip role="ADMIN" />)
    expect(screen.getByText('Administrador')).toBeInTheDocument()
  })

  it('nomeia o síndico', () => {
    render(<RoleChip role="MANAGER" />)
    expect(screen.getByText('Síndico')).toBeInTheDocument()
  })

  it('nomeia o morador', () => {
    render(<RoleChip role="RESIDENT" />)
    expect(screen.getByText('Morador')).toBeInTheDocument()
  })
})
```

Em `tests/app/(app)/users/[id]/page.test.tsx`:

```ts
it('deixa o administrador escolher o papel da pessoa', () => {
  useAccount.mockReturnValue({ account: buildUser({ role: 'ADMIN' }) })
  loaded()

  render(<UserDetailPage />)

  expect(screen.getByRole('radio', { name: 'Síndico' })).toBeEnabled()
})

it('não deixa o síndico mexer no papel de ninguém', () => {
  useAccount.mockReturnValue({ account: buildUser({ role: 'MANAGER' }) })
  loaded()

  render(<UserDetailPage />)

  expect(screen.getByRole('radio', { name: 'Síndico' })).toBeDisabled()
})
```

Em `tests/app/(app)/condominiums/page.test.tsx`:

```ts
it('só oferece criar condomínio a quem é administrador', () => {
  useAccount.mockReturnValue({ account: buildUser({ role: 'MANAGER' }) })
  useCondominiums.mockReturnValue({ page: pageOf([condominium]), isLoading: false, error: null })

  render(<CondominiumsPage />)

  expect(screen.queryByRole('button', { name: 'Novo condomínio' })).not.toBeInTheDocument()
})
```

- [ ] **Passo 2: rodar e ver falhar**

Rodar: `npx vitest run tests/components tests/app`
Esperado: FALHA — `RoleChip` não existe e as telas ainda falam de `isManager`.

- [ ] **Passo 3: implementar**

```tsx
// components/user/role-chip.tsx
'use client'

import { Chip } from '@heroui/react'
import type { ReactElement } from 'react'
import type { UserRole } from '@/shared/types'

export const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  MANAGER: 'Síndico',
  RESIDENT: 'Morador',
}

export function RoleChip({ role }: { role: UserRole }): ReactElement {
  return <Chip variant={role === 'RESIDENT' ? 'soft' : 'primary'}>{ROLE_LABEL[role]}</Chip>
}
```

- Listagem: a coluna "Síndico" vira "Papel" e mostra `<RoleChip role={row.user.role} />`;
  no telefone, o campo "Perfil" usa o mesmo componente.
- Filtro: o `Switch` "Apenas síndicos" vira um `RadioGroup` com os três papéis
  mais "Todos"; `hooks/use-users.ts` manda `role` em vez de `isManager`.
- `app/(app)/users/[id]/page.tsx`: o `Switch` vira um `RadioGroup` dos três
  papéis, com `isDisabled={!isAdmin(account)}`; o `save()` manda `role`.
- `app/(app)/condominiums/page.tsx`: o botão "Novo condomínio" só aparece com
  `isAdmin(account)`.
- `nav-desktop.tsx` e `account/card.tsx`: usar `ROLE_LABEL[account.role]` no
  lugar do ternário de síndico.

Quem é a pessoa da sessão vem de `hooks/use-account.ts`, que já existe e já
consulta `/api/account`. Os testes das telas mockam esse hook — é o `useAccount`
citado nos testes do passo 1.

- [ ] **Passo 4: rodar e ver passar**

Rodar: `npm test` — PASSA, cobertura acima de 95%.

- [ ] **Passo 5: commitar**

```bash
git add -A
git commit -m "feat(usuario): mostra o papel e deixa só o administrador mudá-lo"
```

---

### Tarefa 7: provar o escopo contra o Postgres

**Arquivos:**
- Criar: `tests/integration/authorization.test.ts`

- [ ] **Passo 1: escrever o teste que falha**

```ts
it('não entrega ao síndico do Aurora o condomínio alheio', async () => {
  const { managerId } = await seedTwoCondominiums()

  const page = await condominiums.list({}, { page: 1, pageSize: 10 }, { managedBy: managerId })

  expect(page.items.map((item) => item.name)).toEqual(['Aurora'])
})

it('não entrega o condomínio alheio nem pelo id', async () => {
  const { managerId, otherId } = await seedTwoCondominiums()

  expect(await condominiums.findById(otherId, { managedBy: managerId })).toBeNull()
})

it('entrega os dois ao administrador', async () => {
  await seedTwoCondominiums()

  const page = await condominiums.list({}, { page: 1, pageSize: 10 }, null)

  expect(page.total).toBe(2)
})

it('não mostra ao síndico quem mora no condomínio alheio', async () => {
  const { managerId, aurora } = await seedTwoCondominiums()

  const page = await users.list({}, { page: 1, pageSize: 10 }, { inCondominiums: [aurora] })

  expect(page.items.every((item) => item.id !== 'quem-mora-no-outro')).toBe(true)
})
```

`seedTwoCondominiums` cria dois condomínios, um síndico vinculado ao Aurora com
`role: 'MANAGER'` e um morador vinculado ao outro, no formato de
`tests/integration/condominium.test.ts`.

- [ ] **Passo 2: rodar e ver falhar, depois passar**

Rodar: `npm run test:integration`.
Ver a falha antes de existir o `seed`, implementá-lo e ver passar.

- [ ] **Passo 3: fechar**

```bash
docker compose restart app   # o cliente Prisma velho não conhece a coluna nova
npm test && npm run test:integration && npm run types && npm run lint
git add -A
git commit -m "teste: prova contra o Postgres que o síndico não vê condomínio alheio"
```

Atualizar o `TODO.md` no mesmo commit: marcar "síndico do condomínio governar o
acesso àquele condomínio" e **remover** "toggle de síndico direto na linha", que
a spec cancelou.

---

## O que este plano não faz

- **Portal do morador.** O `RESIDENT` autenticado recebe 403 nas rotas do
  painel. Falta a tela de "sem acesso" e o redirecionamento — entra quando o
  portal existir.
- **Unidades como entidade.** Segue no `TODO.md`, sem relação com este plano.
