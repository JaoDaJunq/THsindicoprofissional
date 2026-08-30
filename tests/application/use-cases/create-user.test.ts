import { createUser } from '@/application/use-cases/create-user'
import { InMemoryUserRepository } from '@/tests/support/in-memory-user-repository'

const input = { email: 'sindico@example.com', name: 'Ana', image: null }

describe('createUser', () => {
  it('stores a user that does not exist yet', async () => {
    const repository = new InMemoryUserRepository()

    const result = await createUser(repository, input)

    expect(result.ok).toBe(true)
    expect(await repository.findByEmail('sindico@example.com')).not.toBeNull()
  })

  it('returns the created user', async () => {
    const repository = new InMemoryUserRepository()

    const result = await createUser(repository, input)

    expect(result.ok && result.value.email).toBe('sindico@example.com')
  })

  it('refuses a duplicate email instead of creating a second user', async () => {
    const repository = new InMemoryUserRepository()
    await createUser(repository, input)

    const result = await createUser(repository, input)

    expect(result).toEqual({ ok: false, error: 'email-already-registered' })
  })

  it('refuses an email without an at sign', async () => {
    const repository = new InMemoryUserRepository()

    const result = await createUser(repository, { ...input, email: 'nao-e-email' })

    expect(result).toEqual({ ok: false, error: 'invalid-email' })
  })

  it('refuses a blank email', async () => {
    const repository = new InMemoryUserRepository()

    const result = await createUser(repository, { ...input, email: '   ' })

    expect(result).toEqual({ ok: false, error: 'invalid-email' })
  })
})
