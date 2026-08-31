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

const ADMIN_ID = '11111111-1111-4111-8111-111111111111'

describe('softDeleteUser', () => {
  it('refuses to delete the person who asked', async () => {
    const { repository, id } = await repositoryWithUser()

    const result = await softDeleteUser(repository, id, id)

    expect(result).toEqual({ ok: false, error: 'cannot-delete-self' })
  })

  it('keeps the person who asked in the listings', async () => {
    const { repository, id } = await repositoryWithUser()

    await softDeleteUser(repository, id, id)

    expect(await repository.findById(id)).not.toBeNull()
  })

  it('keeps the row and only marks it as deleted', async () => {
    const { repository, id } = await repositoryWithUser()

    await softDeleteUser(repository, id, ADMIN_ID)

    expect(repository.rawCount()).toBe(1)
  })

  it('removes the person from listings', async () => {
    const { repository, id } = await repositoryWithUser()

    await softDeleteUser(repository, id, ADMIN_ID)

    expect(await repository.findById(id)).toBeNull()
  })

  it('frees the e-mail for a new sign-up', async () => {
    const { repository, id } = await repositoryWithUser()
    await softDeleteUser(repository, id, ADMIN_ID)

    const again = await createUser(repository, {
      email: 'ana@example.com',
      name: 'Ana',
      image: null,
    })

    expect(again.ok).toBe(true)
  })

  it('reports a person that does not exist', async () => {
    const { repository } = await repositoryWithUser()

    const result = await softDeleteUser(repository, 'ghost', ADMIN_ID)

    expect(result).toEqual({ ok: false, error: 'user-not-found' })
  })
})
