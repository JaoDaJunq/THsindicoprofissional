import { PrismaUserRepository } from '@/infrastructure/repositories/prisma-user-repository'
import type { PrismaUserDelegate } from '@/infrastructure/repositories/prisma-user-repository'
import type { User } from '@/shared/types'
import { buildUser } from '@/tests/support/build-user'

const storedUser: User = buildUser()

function delegate(found: (User & { passwordHash?: string | null }) | null = storedUser): PrismaUserDelegate {
  return {
    findFirst: vi.fn().mockResolvedValue(found),
    create: vi.fn().mockResolvedValue(storedUser),
    update: vi.fn().mockResolvedValue(storedUser),
    findMany: vi.fn().mockResolvedValue([storedUser]),
    count: vi.fn().mockResolvedValue(1),
    updateMany: vi.fn().mockResolvedValue({ count: 1 }),
  }
}

describe('PrismaUserRepository', () => {
  it('clears the exclusion when restoring someone', async () => {
    const spy = delegate()

    await new PrismaUserRepository(spy).restore(storedUser.id)

    expect(spy.updateMany).toHaveBeenCalledWith({
      where: { id: storedUser.id },
      data: { deletedAt: null },
    })
  })

  it('says nobody was restored when the person does not exist', async () => {
    const spy = delegate()
    vi.mocked(spy.updateMany).mockResolvedValue({ count: 0 })

    expect(await new PrismaUserRepository(spy).restore('ghost')).toBe(false)
  })

  it('never returns a soft-deleted row when looking up by id', async () => {
    const spy = delegate()

    await new PrismaUserRepository(spy).findById(storedUser.id)

    expect(spy.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: storedUser.id, deletedAt: null } }),
    )
  })

  it('never returns a soft-deleted row when looking up by e-mail', async () => {
    const spy = delegate()

    await new PrismaUserRepository(spy).findByEmail(storedUser.email)

    expect(spy.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: storedUser.email, deletedAt: null } }),
    )
  })

  it('reports a missing user as null', async () => {
    expect(await new PrismaUserRepository(delegate(null)).findById('missing')).toBeNull()
  })

  it('creates a user', async () => {
    const spy = delegate(null)
    const input = { email: 'novo@example.com', name: 'Bia', image: null }

    await new PrismaUserRepository(spy).create(input)

    expect(spy.create).toHaveBeenCalledWith(expect.objectContaining({ data: input }))
  })

  it('updates only the given fields', async () => {
    const spy = delegate()

    await new PrismaUserRepository(spy).update(storedUser.id, { role: 'MANAGER' })

    expect(spy.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: storedUser.id }, data: { role: 'MANAGER' } }),
    )
  })

  it('deletes by stamping deletedAt, never by removing the row', async () => {
    const spy = delegate()

    await new PrismaUserRepository(spy).softDelete(storedUser.id)

    const call = vi.mocked(spy.update).mock.calls[0]?.[0]
    expect(call?.where).toEqual({ id: storedUser.id })
    expect(call?.data.deletedAt).toBeInstanceOf(Date)
  })

  it('lists only rows that were not deleted', async () => {
    const spy = delegate()

    await new PrismaUserRepository(spy).list({}, { page: 1, pageSize: 10 })

    expect(vi.mocked(spy.findMany).mock.calls[0]?.[0]?.where).toEqual({ deletedAt: null })
  })

  it('searches name and e-mail at once, case-insensitively', async () => {
    const spy = delegate()

    await new PrismaUserRepository(spy).list({ search: 'ana' }, { page: 1, pageSize: 10 })

    expect(vi.mocked(spy.findMany).mock.calls[0]?.[0]?.where).toEqual({
      deletedAt: null,
      OR: [
        { name: { contains: 'ana', mode: 'insensitive' } },
        { email: { contains: 'ana', mode: 'insensitive' } },
      ],
    })
  })

  it('filters the listing by the role', async () => {
    const spy = delegate()

    await new PrismaUserRepository(spy).list({ role: 'ADMIN' }, { page: 1, pageSize: 10 })

    expect(vi.mocked(spy.findMany).mock.calls[0]?.[0]?.where).toEqual({
      deletedAt: null,
      role: 'ADMIN',
    })
  })

  it('looks only at the excluded people when asked for the inactive ones', async () => {
    const spy = delegate()

    await new PrismaUserRepository(spy).list({ status: 'inactive' }, { page: 1, pageSize: 10 })

    expect(vi.mocked(spy.findMany).mock.calls[0]?.[0]?.where).toEqual({
      deletedAt: { not: null },
    })
  })

  it('drops the exclusion filter only when the listing asks for everyone', async () => {
    const spy = delegate()

    await new PrismaUserRepository(spy).list({ status: 'all' }, { page: 1, pageSize: 10 })

    expect(vi.mocked(spy.findMany).mock.calls[0]?.[0]?.where).toEqual({})
  })

  it('filters by code, name and e-mail', async () => {
    const spy = delegate()

    await new PrismaUserRepository(spy).list(
      { id: 'abc', name: 'Ana', email: 'ana@' },
      { page: 1, pageSize: 10 },
    )

    expect(vi.mocked(spy.findMany).mock.calls[0]?.[0]?.where).toEqual({
      deletedAt: null,
      id: 'abc',
      name: { contains: 'Ana', mode: 'insensitive' },
      email: { contains: 'ana@', mode: 'insensitive' },
    })
  })

  it('asks the database for one page only', async () => {
    const spy = delegate()

    await new PrismaUserRepository(spy).list({}, { page: 3, pageSize: 10 })

    const args = vi.mocked(spy.findMany).mock.calls[0]?.[0]
    expect(args?.skip).toBe(20)
    expect(args?.take).toBe(10)
  })

  it('reports how many pages exist', async () => {
    const spy = delegate()
    vi.mocked(spy.count).mockResolvedValue(25)

    const page = await new PrismaUserRepository(spy).list({}, { page: 1, pageSize: 10 })

    expect(page.pageCount).toBe(3)
    expect(page.total).toBe(25)
  })

  it('reports one page when there is nothing to show', async () => {
    const spy = delegate()
    vi.mocked(spy.count).mockResolvedValue(0)

    const page = await new PrismaUserRepository(spy).list({}, { page: 1, pageSize: 10 })

    expect(page.pageCount).toBe(1)
  })
  it('looks a user up by username, skipping deleted rows', async () => {
    const spy = delegate()

    await new PrismaUserRepository(spy).findByUsername('admin')

    expect(spy.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { username: 'admin', deletedAt: null } }),
    )
  })

  it('stores the credentials it is given', async () => {
    const spy = delegate()

    await new PrismaUserRepository(spy).setCredentials(storedUser.id, {
      username: 'admin',
      passwordHash: 'hash',
      mustChangePassword: false,
    })

    expect(spy.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: storedUser.id },
        data: { username: 'admin', passwordHash: 'hash', mustChangePassword: false },
      }),
    )
  })

  it('reads the password hash separately, so it never rides along in User', async () => {
    const spy = delegate({ ...storedUser, passwordHash: 'hash-guardado' })

    const hash = await new PrismaUserRepository(spy).findPasswordHash(storedUser.id)

    expect(hash).toBe('hash-guardado')
  })

  it('reports no hash for someone who never set a password', async () => {
    const spy = delegate({ ...storedUser, passwordHash: null })

    expect(await new PrismaUserRepository(spy).findPasswordHash(storedUser.id)).toBeNull()
  })

  it('reports no hash for someone who does not exist', async () => {
    const spy = delegate(null)

    expect(await new PrismaUserRepository(spy).findPasswordHash('ghost')).toBeNull()
  })
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
})
