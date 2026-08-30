import { PrismaMembershipRepository } from '@/infrastructure/repositories/prisma-membership-repository'
import type {
  MembershipRow,
  PrismaMembershipDelegate,
} from '@/infrastructure/repositories/prisma-membership-repository'

const row: MembershipRow = {
  id: 'aa000000-0000-4000-8000-000000000001',
  role: 'RESIDENT',
  user: { id: 'u1', name: 'Ana', email: 'ana@example.com' },
  condominium: { id: 'c1', name: 'Aurora' },
}

function delegate(found: MembershipRow | null = row): PrismaMembershipDelegate {
  return {
    findFirst: vi.fn().mockResolvedValue(found),
    findMany: vi.fn().mockResolvedValue([row]),
    create: vi.fn().mockResolvedValue(row),
    updateMany: vi.fn().mockResolvedValue({ count: 1 }),
  }
}

const repository = (spy: PrismaMembershipDelegate) => new PrismaMembershipRepository(spy)

describe('PrismaMembershipRepository', () => {
  it('lists the active links of one condominium', async () => {
    const spy = delegate()

    await repository(spy).list({ condominiumId: 'c1' })

    expect(spy.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { condominiumId: 'c1', deletedAt: null } }),
    )
  })

  it('lists the active links of one person', async () => {
    const spy = delegate()

    await repository(spy).list({ userId: 'u1' })

    expect(spy.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u1', deletedAt: null } }),
    )
  })

  it('brings the person and the condominium along, not only their ids', async () => {
    const spy = delegate()

    const found = await repository(spy).list({ userId: 'u1' })

    expect(found[0]?.user.email).toBe('ana@example.com')
  })

  it('never finds a link that was removed', async () => {
    const spy = delegate()

    await repository(spy).find('u1', 'c1')

    expect(spy.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u1', condominiumId: 'c1', deletedAt: null } }),
    )
  })

  it('reports a missing link as null', async () => {
    expect(await repository(delegate(null)).find('u1', 'c1')).toBeNull()
  })

  it('stores the link that was asked for', async () => {
    const spy = delegate()

    await repository(spy).add({ userId: 'u1', condominiumId: 'c1', role: 'MANAGER' })

    expect(spy.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { userId: 'u1', condominiumId: 'c1', role: 'MANAGER' },
      }),
    )
  })

  it('changes the role of the active link', async () => {
    const spy = delegate()

    await repository(spy).setRole('u1', 'c1', 'MANAGER')

    expect(spy.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u1', condominiumId: 'c1', deletedAt: null },
      data: { role: 'MANAGER' },
    })
  })

  it('reports no link to promote', async () => {
    const spy = delegate()
    vi.mocked(spy.updateMany).mockResolvedValue({ count: 0 })

    expect(await repository(spy).setRole('u1', 'c1', 'MANAGER')).toBeNull()
  })

  it('marks the link as deleted instead of removing it', async () => {
    const spy = delegate()

    await repository(spy).remove('u1', 'c1')

    expect(spy.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u1', condominiumId: 'c1', deletedAt: null },
      data: { deletedAt: expect.any(Date) },
    })
  })

  it('says nothing was removed when there is no active link', async () => {
    const spy = delegate()
    vi.mocked(spy.updateMany).mockResolvedValue({ count: 0 })

    expect(await repository(spy).remove('u1', 'c1')).toBe(false)
  })
})
