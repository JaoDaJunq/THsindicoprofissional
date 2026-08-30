import { authenticateUser } from '@/application/use-cases/authenticate-user'
import { InMemoryUserRepository } from '@/tests/support/in-memory-user-repository'
import { FakePasswordHasher } from '@/tests/support/fake-password-hasher'

const hasher = new FakePasswordHasher()

async function repositoryWithAdmin(): Promise<InMemoryUserRepository> {
  const repository = new InMemoryUserRepository()
  const user = await repository.create({
    email: 'admin@example.com',
    name: 'Admin',
    image: null,
  })
  await repository.setCredentials(user.id, {
    username: 'admin',
    passwordHash: await hasher.hash('admin'),
  })
  return repository
}

describe('authenticateUser', () => {
  it('accepts the right username and password', async () => {
    const result = await authenticateUser(await repositoryWithAdmin(), hasher, {
      username: 'admin',
      password: 'admin',
    })

    expect(result.ok).toBe(true)
  })

  it('refuses a wrong password', async () => {
    const result = await authenticateUser(await repositoryWithAdmin(), hasher, {
      username: 'admin',
      password: 'errada',
    })

    expect(result).toEqual({ ok: false, error: 'invalid-credentials' })
  })

  it('gives the same answer for an unknown username, so it leaks nothing', async () => {
    const result = await authenticateUser(await repositoryWithAdmin(), hasher, {
      username: 'ninguem',
      password: 'admin',
    })

    expect(result).toEqual({ ok: false, error: 'invalid-credentials' })
  })

  it('refuses a person with no password set', async () => {
    const repository = new InMemoryUserRepository()
    await repository.create({ email: 'sem@example.com', name: null, image: null })

    const result = await authenticateUser(repository, hasher, {
      username: 'sem',
      password: 'qualquer',
    })

    expect(result).toEqual({ ok: false, error: 'invalid-credentials' })
  })

  it('refuses an inactive person even with the right password', async () => {
    const repository = await repositoryWithAdmin()
    const admin = await repository.findByUsername('admin')
    if (!admin) throw new Error('fixture failed')
    await repository.update(admin.id, { isActive: false })

    const result = await authenticateUser(repository, hasher, {
      username: 'admin',
      password: 'admin',
    })

    expect(result).toEqual({ ok: false, error: 'inactive-user' })
  })

  it('reports that the password still has to be changed', async () => {
    const result = await authenticateUser(await repositoryWithAdmin(), hasher, {
      username: 'admin',
      password: 'admin',
    })

    expect(result.ok && result.value.mustChangePassword).toBe(true)
  })
  it('refuses someone who has a username but never got a password', async () => {
    const repository = new InMemoryUserRepository()
    const user = await repository.create({
      email: 'google@example.com',
      name: 'Veio do Google',
      image: null,
    })
    await repository.setCredentials(user.id, { username: 'google', passwordHash: '' })

    const result = await authenticateUser(repository, hasher, {
      username: 'google',
      password: 'qualquer',
    })

    expect(result).toEqual({ ok: false, error: 'invalid-credentials' })
  })
})
