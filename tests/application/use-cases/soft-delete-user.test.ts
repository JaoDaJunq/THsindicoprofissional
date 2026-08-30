import { softDeleteUser } from '@/application/use-cases/soft-delete-user'
import { createUser } from '@/application/use-cases/create-user'
import { InMemoryUserRepository } from '@/tests/support/in-memory-user-repository'

async function repositoryWithUser(): Promise<{
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
  return { repository, id: created.value.id }
}

describe('softDeleteUser', () => {
  it('keeps the row and only marks it as deleted', async () => {
    const { repository, id } = await repositoryWithUser()

    await softDeleteUser(repository, id)

    expect(repository.rawCount()).toBe(1)
  })

  it('removes the person from listings', async () => {
    const { repository, id } = await repositoryWithUser()

    await softDeleteUser(repository, id)

    expect(await repository.findById(id)).toBeNull()
  })

  it('frees the e-mail for a new sign-up', async () => {
    const { repository, id } = await repositoryWithUser()
    await softDeleteUser(repository, id)

    const again = await createUser(repository, {
      email: 'ana@example.com',
      name: 'Ana',
      image: null,
    })

    expect(again.ok).toBe(true)
  })

  it('reports a person that does not exist', async () => {
    const { repository } = await repositoryWithUser()

    const result = await softDeleteUser(repository, 'ghost')

    expect(result).toEqual({ ok: false, error: 'user-not-found' })
  })
})
