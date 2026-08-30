import { PrismaCondominiumRepository } from '@/infrastructure/repositories/prisma-condominium-repository'
import type { PrismaCondominiumDelegate } from '@/infrastructure/repositories/prisma-condominium-repository'
import type { CondominiumRow } from '@/infrastructure/repositories/prisma-condominium-repository'
import { buildCondominium } from '@/tests/support/build-condominium'

const { residentsCount, ...columns } = buildCondominium()
const stored: CondominiumRow = { ...columns, _count: { members: residentsCount } }

function delegate(found: CondominiumRow | null = stored): PrismaCondominiumDelegate {
  return {
    findFirst: vi.fn().mockResolvedValue(found),
    create: vi.fn().mockResolvedValue(stored),
    update: vi.fn().mockResolvedValue(stored),
    findMany: vi.fn().mockResolvedValue([stored]),
    count: vi.fn().mockResolvedValue(1),
    updateMany: vi.fn().mockResolvedValue({ count: 1 }),
  }
}

const repository = (spy: PrismaCondominiumDelegate) => new PrismaCondominiumRepository(spy)

describe('PrismaCondominiumRepository', () => {
  it('never returns a soft-deleted row when looking up by id', async () => {
    const spy = delegate()

    await repository(spy).findById(stored.id)

    expect(spy.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: stored.id, deletedAt: null } }),
    )
  })

  it('never returns a soft-deleted row when looking up by cnpj', async () => {
    const spy = delegate()

    await repository(spy).findByCnpj('12345678000199')

    expect(spy.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { cnpj: '12345678000199', deletedAt: null } }),
    )
  })

  it('reports a missing condominium as null', async () => {
    expect(await repository(delegate(null)).findById('missing')).toBeNull()
  })

  it('marks the row as deleted instead of removing it', async () => {
    const spy = delegate()

    await repository(spy).softDelete(stored.id)

    expect(spy.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: stored.id },
        data: { deletedAt: expect.any(Date) },
      }),
    )
  })

  it('clears the exclusion when restoring', async () => {
    const spy = delegate()

    await repository(spy).restore(stored.id)

    expect(spy.updateMany).toHaveBeenCalledWith({
      where: { id: stored.id },
      data: { deletedAt: null },
    })
  })

  it('says nothing was restored when the condominium does not exist', async () => {
    const spy = delegate()
    vi.mocked(spy.updateMany).mockResolvedValue({ count: 0 })

    expect(await repository(spy).restore('ghost')).toBe(false)
  })

  it('counts the active residents of the condominium', async () => {
    const spy = delegate()

    const page = await repository(spy).list({}, { page: 1, pageSize: 10 })

    expect(page.items[0]?.residentsCount).toBe(120)
  })

  it('counts only the links that are active and of a resident', async () => {
    const spy = delegate()

    await repository(spy).list({}, { page: 1, pageSize: 10 })

    expect(vi.mocked(spy.findMany).mock.calls[0]?.[0].include).toEqual({
      _count: { select: { members: { where: { deletedAt: null, role: 'RESIDENT' } } } },
    })
  })

  it('counts the residents of a single condominium too', async () => {
    const spy = delegate()

    const found = await repository(spy).findById(stored.id)

    expect(found?.residentsCount).toBe(120)
  })

  it('stores what it was given', async () => {
    const spy = delegate()

    await repository(spy).create({ name: 'Aurora', address: 'Rua A' })

    expect(spy.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { name: 'Aurora', address: 'Rua A' } }),
    )
  })

  it('changes only the fields it was given', async () => {
    const spy = delegate()

    await repository(spy).update(stored.id, { name: 'Aurora II' })

    expect(spy.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: stored.id }, data: { name: 'Aurora II' } }),
    )
  })

  it('filters the listing by name and cnpj', async () => {
    const spy = delegate()

    await repository(spy).list({ name: 'Aurora', cnpj: '123' }, { page: 1, pageSize: 10 })

    expect(spy.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          name: { contains: 'Aurora', mode: 'insensitive' },
          cnpj: { contains: '123', mode: 'insensitive' },
        }),
      }),
    )
  })

  it('hides excluded rows from the listing by default', async () => {
    const spy = delegate()

    await repository(spy).list({}, { page: 1, pageSize: 10 })

    expect(spy.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { deletedAt: null } }),
    )
  })

  it('shows only excluded rows when the listing asks for them', async () => {
    const spy = delegate()

    await repository(spy).list({ status: 'inactive' }, { page: 1, pageSize: 10 })

    expect(spy.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { deletedAt: { not: null } } }),
    )
  })

  it('drops the exclusion filter when the listing asks for everyone', async () => {
    const spy = delegate()

    await repository(spy).list({ status: 'all' }, { page: 1, pageSize: 10 })

    expect(spy.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }))
  })

  it('searches name, address and cnpj at once', async () => {
    const spy = delegate()

    await repository(spy).list({ search: 'aurora' }, { page: 1, pageSize: 10 })

    expect(vi.mocked(spy.findMany).mock.calls[0]?.[0].where.OR).toHaveLength(3)
  })

  it('counts the pages from the total', async () => {
    const spy = delegate()
    vi.mocked(spy.count).mockResolvedValue(21)

    const page = await repository(spy).list({}, { page: 1, pageSize: 10 })

    expect(page.pageCount).toBe(3)
  })

  it('reports a single page when there is nothing stored', async () => {
    const spy = delegate()
    vi.mocked(spy.count).mockResolvedValue(0)

    const page = await repository(spy).list({}, { page: 1, pageSize: 10 })

    expect(page.pageCount).toBe(1)
  })
})
