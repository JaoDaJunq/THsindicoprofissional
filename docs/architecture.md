# Architecture

Four layers, one direction of dependency:

```
shared/          types both sides import — depends on nothing
domain/          ports (interfaces). Depends only on shared/
application/     use cases. Depend on domain/ + shared/
infrastructure/  adapters: Prisma, Auth.js, HTTP parsing
app/ components/ hooks/   UI. Talk to the API, never to a repository
```

An inner layer never imports an outer one. `application/` has no idea Prisma
exists; it only knows the `UserRepository` port.

## Where a new feature goes

Adding "archive a unit" looks like this, in order:

1. `shared/types/unit.ts` — the shape both sides need.
2. `domain/repositories/unit-repository.ts` — the method the use case will call.
3. `application/use-cases/archive-unit.ts` — the rule, returning `Result`.
4. `infrastructure/repositories/prisma-unit-repository.ts` — the real query.
5. `app/api/units/[id]/route.ts` — HTTP in, HTTP out. No rules here.
6. `components/units/…` — the screen, talking to that route.

## Use cases

A use case is a plain function: repository first, then input. No classes, no
DI container — the repository is a parameter.

```ts
export async function createUser(
  repository: UserRepository,
  input: CreateUserInput,
): Promise<Result<User, CreateUserError>>
```

Failure is a value, not an exception. `Result<T, E>` forces the caller through
the failure branch, and the error is a string literal union so a typo is a
compile error instead of a 500 at runtime.

Use cases are tested against `tests/support/in-memory-user-repository.ts`, so
the whole suite runs without a database.

## Rendering

**No server components for data.** Screens are `'use client'` and fetch from
`/api/*`. Server code is limited to route handlers, the root layout, and the
Auth.js wiring.

## Types

Everything is typed. ESLint enforces it: `no-explicit-any` and
`explicit-function-return-type` are errors, not warnings. Types shared by
server and client live in `shared/types/` and must never import Prisma —
otherwise the client bundle drags the ORM along.

## Soft delete

Nothing is ever deleted. See `.claude/rules/soft-delete.md`. Reads filter
`deletedAt: null` inside the repository, so no caller can forget. Uniqueness
uses partial indexes (`WHERE "deletedAt" IS NULL`), so a deleted person's
e-mail does not block a new sign-up.

## Authentication

Auth.js v5 with the Prisma adapter and Google as the only provider. There is no
sign-up screen by design: **a user is created on first sign-in**, and
`isManager` defaults to `false` — everyone starts as a resident. The manager
flag is never self-assigned; it is granted from the users screen.

Callback URL registered with Google:
`http://localhost:3000/api/auth/callback/google`

## Testing

Tests live in `tests/`, mirroring the source tree, so the application folders
stay free of them. Coverage threshold is 95% and breaks the build.

Two files are excluded from coverage, in `vitest.config.mts`:
`infrastructure/auth/auth.ts` and `app/api/**`. They are composition roots —
they wire libraries together and hold no branch of ours. Testing them would
assert that the framework was called, not that anything of ours works.

## Language

Code is English: identifiers, files, folders, comments, tests. Two exceptions,
both deliberate: **text shown to users** and **commit messages** are pt-BR.
