import { setCredentials } from '@/application/use-cases/set-credentials'
import { createUser } from '@/application/use-cases/create-user'
import { InMemoryUserRepository } from '@/tests/support/in-memory-user-repository'
import { FakePasswordHasher } from '@/tests/support/fake-password-hasher'
import type { UserId } from '@/shared/types'

const hasher = new FakePasswordHasher()

async function repositoryWithUser(): Promise<{
  repository: InMemoryUserRepository
  id: UserId
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

describe('setCredentials', () => {
  it('gives the person a username', async () => {
    const { repository, id } = await repositoryWithUser()

    await setCredentials(repository, hasher, id, { username: 'ana', password: 'uma-senha' })

    expect((await repository.findByUsername('ana'))?.id).toBe(id)
  })

  it('stores the password hashed, never as it was typed', async () => {
    const { repository, id } = await repositoryWithUser()

    await setCredentials(repository, hasher, id, { username: 'ana', password: 'uma-senha' })

    expect(await repository.findPasswordHash(id)).not.toBe('uma-senha')
  })

  it('makes the person replace the password someone else chose', async () => {
    const { repository, id } = await repositoryWithUser()

    await setCredentials(repository, hasher, id, { username: 'ana', password: 'uma-senha' })

    expect((await repository.findById(id))?.mustChangePassword).toBe(true)
  })

  it('refuses a password shorter than the minimum', async () => {
    const { repository, id } = await repositoryWithUser()

    const result = await setCredentials(repository, hasher, id, {
      username: 'ana',
      password: 'curta',
    })

    expect(result).toEqual({ ok: false, error: 'password-too-short' })
  })

  it('refuses an empty username', async () => {
    const { repository, id } = await repositoryWithUser()

    const result = await setCredentials(repository, hasher, id, {
      username: '  ',
      password: 'uma-senha',
    })

    expect(result).toEqual({ ok: false, error: 'invalid-username' })
  })

  it('refuses a username that belongs to someone else', async () => {
    const { repository, id } = await repositoryWithUser()
    const other = await createUser(repository, {
      email: 'outra@example.com',
      name: 'Outra',
      image: null,
    })
    if (!other.ok) throw new Error('fixture failed')
    await setCredentials(repository, hasher, other.value.id, {
      username: 'ana',
      password: 'uma-senha',
    })

    const result = await setCredentials(repository, hasher, id, {
      username: 'ana',
      password: 'uma-senha',
    })

    expect(result).toEqual({ ok: false, error: 'username-taken' })
  })

  it('reports a person that does not exist', async () => {
    const { repository } = await repositoryWithUser()

    const result = await setCredentials(repository, hasher, 'ghost', {
      username: 'ana',
      password: 'uma-senha',
    })

    expect(result).toEqual({ ok: false, error: 'user-not-found' })
  })
})
