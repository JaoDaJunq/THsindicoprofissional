import { restoreCondominium } from '@/application/use-cases/restore-condominium'
import { softDeleteCondominium } from '@/application/use-cases/soft-delete-condominium'
import { InMemoryCondominiumRepository } from '@/tests/support/in-memory-condominium-repository'

describe('restoreCondominium', () => {
  it('brings the condominium back to the listings', async () => {
    const repository = new InMemoryCondominiumRepository()
    const { id } = await repository.create({ name: 'Aurora', address: 'Rua A' })
    await softDeleteCondominium(repository, id)

    await restoreCondominium(repository, id)

    expect(await repository.findById(id)).not.toBeNull()
  })

  it('reports a condominium that does not exist', async () => {
    const repository = new InMemoryCondominiumRepository()

    const result = await restoreCondominium(repository, 'ghost')

    expect(result).toEqual({ ok: false, error: 'condominium-not-found' })
  })
})
