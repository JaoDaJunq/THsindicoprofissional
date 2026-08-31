import { restoreUser } from '@/application/use-cases/restore-user'
import { createUser } from '@/application/use-cases/create-user'
import { InMemoryUserRepository } from '@/tests/support/in-memory-user-repository'

async function repositoryWithExcludedUser(): Promise<{
  repository: InMemoryUserRepository
  id: string
}> {
  const repository = new InMemoryUserRepository()
  const created = await createUser(repository, {
    email: 'ana@example.com',
    name: 'Ana',
    image: null,
  })
  if (!created.ok) throw new Error('fixture failed')
  await repository.softDelete(created.value.id)
  return { repository, id: created.value.id }
}

describe('restoreUser', () => {
  it('brings the person back to the listings', async () => {
    const { repository, id } = await repositoryWithExcludedUser()

    await restoreUser(repository, id)

    expect(await repository.findById(id)).not.toBeNull()
  })

  it('reports a person that does not exist', async () => {
    const { repository } = await repositoryWithExcludedUser()

    const result = await restoreUser(repository, 'ghost')

    expect(result).toEqual({ ok: false, error: 'user-not-found' })
  })
})
