import { listCondominiums } from '@/application/use-cases/list-condominiums'
import { InMemoryCondominiumRepository } from '@/tests/support/in-memory-condominium-repository'

const page = { page: 1, pageSize: 10 }

describe('listCondominiums', () => {
  it('returns the stored condominiums', async () => {
    const repository = new InMemoryCondominiumRepository()
    await repository.create({ name: 'Aurora', address: 'Rua A' })

    const result = await listCondominiums(repository, {}, page)

    expect(result.ok && result.value.total).toBe(1)
  })

  it('refuses a page below one', async () => {
    const repository = new InMemoryCondominiumRepository()

    const result = await listCondominiums(repository, {}, { ...page, page: 0 })

    expect(result).toEqual({ ok: false, error: 'invalid-page' })
  })

  it('refuses a page size beyond the maximum', async () => {
    const repository = new InMemoryCondominiumRepository()

    const result = await listCondominiums(repository, {}, { ...page, pageSize: 1000 })

    expect(result).toEqual({ ok: false, error: 'invalid-page-size' })
  })
})
