import { applyImpersonation } from '@/infrastructure/auth/impersonation'
import { InMemoryUserRepository } from '@/tests/support/in-memory-user-repository'
import type { User } from '@/shared/types'

async function cenario(): Promise<{
  users: InMemoryUserRepository
  admin: User
  morador: User
  outroAdmin: User
}> {
  const users = new InMemoryUserRepository()
  const admin = await users.create({ email: 'admin@local', name: 'Admin', image: null })
  const morador = await users.create({ email: 'ana@example.com', name: 'Ana', image: null })
  const outroAdmin = await users.create({ email: 'dois@local', name: 'Dois', image: null })

  return {
    users,
    admin: await users.update(admin.id, { role: 'ADMIN' }),
    morador,
    outroAdmin: await users.update(outroAdmin.id, { role: 'ADMIN' }),
  }
}

describe('applyImpersonation', () => {
  it('troca o dono do token quando quem pede é administrador', async () => {
    const { users, admin, morador } = await cenario()

    const token = await applyImpersonation(
      { sub: admin.id },
      { impersonate: morador.id },
      users,
    )

    expect(token).toEqual({ sub: morador.id, impersonatorId: admin.id })
  })

  it('ignora o pedido de quem não é administrador', async () => {
    const { users, admin, morador } = await cenario()

    const token = await applyImpersonation(
      { sub: morador.id },
      { impersonate: admin.id },
      users,
    )

    expect(token).toEqual({ sub: morador.id })
  })

  it('ignora o pedido de virar outro administrador', async () => {
    const { users, admin, outroAdmin } = await cenario()

    const token = await applyImpersonation(
      { sub: admin.id },
      { impersonate: outroAdmin.id },
      users,
    )

    expect(token).toEqual({ sub: admin.id })
  })

  it('ignora um alvo que não existe', async () => {
    const { users, admin } = await cenario()

    const token = await applyImpersonation({ sub: admin.id }, { impersonate: 'ghost' }, users)

    expect(token).toEqual({ sub: admin.id })
  })

  it('não deixa encadear: quem já está impersonando não vira uma terceira pessoa pelo alvo', async () => {
    const { users, admin, morador } = await cenario()
    const outro = await users.create({ email: 'tres@example.com', name: 'Três', image: null })

    // o token já está na pele do morador; quem manda continua sendo o admin
    const token = await applyImpersonation(
      { sub: morador.id, impersonatorId: admin.id },
      { impersonate: outro.id },
      users,
    )

    expect(token).toEqual({ sub: outro.id, impersonatorId: admin.id })
  })

  it('devolve o token ao administrador quando ele sai', async () => {
    const { users, admin, morador } = await cenario()

    const token = await applyImpersonation(
      { sub: morador.id, impersonatorId: admin.id },
      { stopImpersonating: true },
      users,
    )

    expect(token).toEqual({ sub: admin.id })
  })

  it('não faz nada ao sair de quem não estava impersonando', async () => {
    const { users, morador } = await cenario()

    const token = await applyImpersonation(
      { sub: morador.id },
      { stopImpersonating: true },
      users,
    )

    expect(token).toEqual({ sub: morador.id })
  })

  it('não mexe no token quando o pedido não diz nada', async () => {
    const { users, admin } = await cenario()

    expect(await applyImpersonation({ sub: admin.id }, {}, users)).toEqual({ sub: admin.id })
  })

  it('não aceita um alvo que não seja texto', async () => {
    const { users, admin } = await cenario()

    const token = await applyImpersonation(
      { sub: admin.id },
      { impersonate: { toString: () => 'x' } } as never,
      users,
    )

    expect(token).toEqual({ sub: admin.id })
  })
})
