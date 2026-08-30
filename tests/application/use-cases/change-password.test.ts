import { changePassword } from '@/application/use-cases/change-password'
import { InMemoryUserRepository } from '@/tests/support/in-memory-user-repository'
import { FakePasswordHasher } from '@/tests/support/fake-password-hasher'

const hasher = new FakePasswordHasher()

async function repositoryWithAdmin(): Promise<{
  repository: InMemoryUserRepository
  id: string
}> {
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
  return { repository, id: user.id }
}

describe('changePassword', () => {
  it('replaces the password when the current one is right', async () => {
    const { repository, id } = await repositoryWithAdmin()

    const result = await changePassword(repository, hasher, id, {
      currentPassword: 'admin',
      newPassword: 'uma-senha-longa',
    })

    expect(result.ok).toBe(true)
  })

  it('clears the flag that forces the change', async () => {
    const { repository, id } = await repositoryWithAdmin()

    await changePassword(repository, hasher, id, {
      currentPassword: 'admin',
      newPassword: 'uma-senha-longa',
    })

    expect((await repository.findById(id))?.mustChangePassword).toBe(false)
  })

  it('refuses a wrong current password', async () => {
    const { repository, id } = await repositoryWithAdmin()

    const result = await changePassword(repository, hasher, id, {
      currentPassword: 'errada',
      newPassword: 'uma-senha-longa',
    })

    expect(result).toEqual({ ok: false, error: 'invalid-credentials' })
  })

  it('refuses a password shorter than the minimum', async () => {
    const { repository, id } = await repositoryWithAdmin()

    const result = await changePassword(repository, hasher, id, {
      currentPassword: 'admin',
      newPassword: 'curta',
    })

    expect(result).toEqual({ ok: false, error: 'password-too-short' })
  })

  it('refuses reusing the same password, which would defeat the forced change', async () => {
    const { repository, id } = await repositoryWithAdmin()
    await changePassword(repository, hasher, id, {
      currentPassword: 'admin',
      newPassword: 'senha-ja-trocada',
    })

    const result = await changePassword(repository, hasher, id, {
      currentPassword: 'senha-ja-trocada',
      newPassword: 'senha-ja-trocada',
    })

    expect(result).toEqual({ ok: false, error: 'password-unchanged' })
  })

  it('reports a person that does not exist', async () => {
    const { repository } = await repositoryWithAdmin()

    const result = await changePassword(repository, hasher, 'ghost', {
      currentPassword: 'admin',
      newPassword: 'uma-senha-longa',
    })

    expect(result).toEqual({ ok: false, error: 'user-not-found' })
  })
  it('refuses changing the password of someone who has none', async () => {
    const repository = new InMemoryUserRepository()
    const user = await repository.create({
      email: 'google@example.com',
      name: 'Veio do Google',
      image: null,
    })

    const result = await changePassword(repository, hasher, user.id, {
      currentPassword: 'qualquer',
      newPassword: 'uma-senha-longa',
    })

    expect(result).toEqual({ ok: false, error: 'invalid-credentials' })
  })
})
