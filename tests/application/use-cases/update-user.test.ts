import { updateUser } from '@/application/use-cases/update-user'
import { createUser } from '@/application/use-cases/create-user'
import { InMemoryUserRepository } from '@/tests/support/in-memory-user-repository'
import type { UserId } from '@/shared/types'

async function repositoryWithUser(): Promise<{
  repository: InMemoryUserRepository
  id: UserId
}> {
  const repository = new InMemoryUserRepository()
  const created = await createUser(repository, {
    email: 'sindico@example.com',
    name: 'Ana',
    image: null,
  })
  if (!created.ok) throw new Error('fixture failed')
  return { repository, id: created.value.id }
}

describe('updateUser', () => {
  it('changes the name of an existing user', async () => {
    const { repository, id } = await repositoryWithUser()

    const result = await updateUser(repository, id, { name: 'Ana Paula' })

    expect(result.ok && result.value.name).toBe('Ana Paula')
  })

  it('keeps untouched fields as they were', async () => {
    const { repository, id } = await repositoryWithUser()

    const result = await updateUser(repository, id, { image: 'https://img/a.png' })

    expect(result.ok && result.value.name).toBe('Ana')
  })

  it('reports a user that does not exist', async () => {
    const { repository } = await repositoryWithUser()

    const result = await updateUser(repository, 'ghost', { name: 'X' })

    expect(result).toEqual({ ok: false, error: 'user-not-found' })
  })

  it('refuses a blank name, which would erase the display name', async () => {
    const { repository, id } = await repositoryWithUser()

    const result = await updateUser(repository, id, { name: '  ' })

    expect(result).toEqual({ ok: false, error: 'invalid-name' })
  })
})
