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
  it('repassa o escopo de quem pediu para o repositório', async () => {
    const repository = new InMemoryCondominiumRepository()
    const { id } = await repository.create({ name: 'Aurora', address: 'Rua A' })
    repository.linkManager('u1', id)

    const doSindico = await listCondominiums(repository, {}, page, { managedBy: 'u1' })
    const deOutro = await listCondominiums(repository, {}, page, { managedBy: 'u2' })

    expect(doSindico.ok && doSindico.value.total).toBe(1)
    expect(deOutro.ok && deOutro.value.total).toBe(0)
  })

  it('não limita quem não tem escopo', async () => {
    const repository = new InMemoryCondominiumRepository()
    await repository.create({ name: 'Aurora', address: 'Rua A' })

    const result = await listCondominiums(repository, {}, page, null)

    expect(result.ok && result.value.total).toBe(1)
  })
})
