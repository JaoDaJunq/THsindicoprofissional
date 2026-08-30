import { updateCondominium } from '@/application/use-cases/update-condominium'
import { InMemoryCondominiumRepository } from '@/tests/support/in-memory-condominium-repository'

async function repositoryWithCondominium(): Promise<{
  repository: InMemoryCondominiumRepository
  id: string
}> {
  const repository = new InMemoryCondominiumRepository()
  const created = await repository.create({
    name: 'Aurora',
    address: 'Rua A',
    cnpj: '12345678000199',
  })
  return { repository, id: created.id }
}

describe('updateCondominium', () => {
  it('changes the name', async () => {
    const { repository, id } = await repositoryWithCondominium()

    const result = await updateCondominium(repository, id, { name: 'Aurora II' })

    expect(result.ok && result.value.name).toBe('Aurora II')
  })

  it('reports a condominium that does not exist', async () => {
    const { repository } = await repositoryWithCondominium()

    const result = await updateCondominium(repository, 'ghost', { name: 'Aurora' })

    expect(result).toEqual({ ok: false, error: 'condominium-not-found' })
  })

  it('refuses a blank name', async () => {
    const { repository, id } = await repositoryWithCondominium()

    const result = await updateCondominium(repository, id, { name: '  ' })

    expect(result).toEqual({ ok: false, error: 'invalid-name' })
  })

  it('keeps its own cnpj without reporting a duplicate', async () => {
    const { repository, id } = await repositoryWithCondominium()

    const result = await updateCondominium(repository, id, { cnpj: '12.345.678/0001-99' })

    expect(result.ok).toBe(true)
  })

  it('refuses a cnpj that belongs to another condominium', async () => {
    const { repository, id } = await repositoryWithCondominium()
    await repository.create({ name: 'Outro', address: 'Rua B', cnpj: '98765432000188' })

    const result = await updateCondominium(repository, id, { cnpj: '98765432000188' })

    expect(result).toEqual({ ok: false, error: 'cnpj-already-registered' })
  })

  it('clears the cnpj when the field comes empty', async () => {
    const { repository, id } = await repositoryWithCondominium()

    const result = await updateCondominium(repository, id, { cnpj: '' })

    expect(result.ok && result.value.cnpj).toBeNull()
  })
})
