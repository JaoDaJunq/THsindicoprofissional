import { softDeleteCondominium } from '@/application/use-cases/soft-delete-condominium'
import { InMemoryCondominiumRepository } from '@/tests/support/in-memory-condominium-repository'

async function repositoryWithCondominium(): Promise<{
  repository: InMemoryCondominiumRepository
  id: string
}> {
  const repository = new InMemoryCondominiumRepository()
  const created = await repository.create({ name: 'Aurora', address: 'Rua A' })
  return { repository, id: created.id }
}

describe('softDeleteCondominium', () => {
  it('keeps the row and only marks it as deleted', async () => {
    const { repository, id } = await repositoryWithCondominium()

    await softDeleteCondominium(repository, id)

    expect(repository.rawCount()).toBe(1)
  })

  it('removes the condominium from listings', async () => {
    const { repository, id } = await repositoryWithCondominium()

    await softDeleteCondominium(repository, id)

    expect(await repository.findById(id)).toBeNull()
  })

  it('reports a condominium that does not exist', async () => {
    const { repository } = await repositoryWithCondominium()

    const result = await softDeleteCondominium(repository, 'ghost')

    expect(result).toEqual({ ok: false, error: 'condominium-not-found' })
  })
})
