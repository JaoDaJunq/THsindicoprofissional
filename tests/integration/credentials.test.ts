import { authenticateUser } from '@/application/use-cases/authenticate-user'
import { changePassword } from '@/application/use-cases/change-password'
import { PrismaUserRepository } from '@/infrastructure/repositories/prisma-user-repository'
import type { PrismaUserDelegate } from '@/infrastructure/repositories/prisma-user-repository'
import { Argon2PasswordHasher } from '@/infrastructure/security/argon2-password-hasher'
import { prisma, resetUsers } from './setup'

// Real repository, real Postgres, real argon2: this is the pass that catches a
// query the mocks would happily accept.
const repository = new PrismaUserRepository(prisma.user as unknown as PrismaUserDelegate)
const hasher = new Argon2PasswordHasher()

async function seedAdmin(): Promise<string> {
  const user = await repository.create({
    email: 'admin@local',
    name: 'Administrador',
    image: null,
  })
  await repository.setCredentials(user.id, {
    username: 'admin',
    passwordHash: await hasher.hash('admin'),
    mustChangePassword: true,
  })
  return user.id
}

beforeEach(resetUsers)
afterAll(async () => {
  await resetUsers()
  await prisma.$disconnect()
})

describe('credentials against the real database', () => {
  it('does not force a password change on someone who was never handed one', async () => {
    const user = await repository.create({
      email: 'morador@example.com',
      name: 'Morador',
      image: null,
    })

    expect(user.mustChangePassword).toBe(false)
  })

  it('signs the default admin in', async () => {
    await seedAdmin()

    const result = await authenticateUser(repository, hasher, {
      username: 'admin',
      password: 'admin',
    })

    expect(result.ok).toBe(true)
  })

  it('reports that the handed-out password must be replaced', async () => {
    await seedAdmin()

    const result = await authenticateUser(repository, hasher, {
      username: 'admin',
      password: 'admin',
    })

    expect(result.ok && result.value.mustChangePassword).toBe(true)
  })

  it('refuses the wrong password', async () => {
    await seedAdmin()

    const result = await authenticateUser(repository, hasher, {
      username: 'admin',
      password: 'nao-e-essa',
    })

    expect(result).toEqual({ ok: false, error: 'invalid-credentials' })
  })

  it('never returns the password hash as part of the user', async () => {
    const id = await seedAdmin()

    const user = await repository.findById(id)

    expect(user).not.toHaveProperty('passwordHash')
  })

  it('changes the password and lets the new one in', async () => {
    const id = await seedAdmin()

    await changePassword(repository, hasher, id, {
      currentPassword: 'admin',
      newPassword: 'uma-senha-de-verdade',
    })

    const result = await authenticateUser(repository, hasher, {
      username: 'admin',
      password: 'uma-senha-de-verdade',
    })

    expect(result.ok).toBe(true)
  })

  it('stops accepting the old password afterwards', async () => {
    const id = await seedAdmin()
    await changePassword(repository, hasher, id, {
      currentPassword: 'admin',
      newPassword: 'uma-senha-de-verdade',
    })

    const result = await authenticateUser(repository, hasher, {
      username: 'admin',
      password: 'admin',
    })

    expect(result).toEqual({ ok: false, error: 'invalid-credentials' })
  })

  it('stops forcing the change once the password is the person own', async () => {
    const id = await seedAdmin()

    await changePassword(repository, hasher, id, {
      currentPassword: 'admin',
      newPassword: 'uma-senha-de-verdade',
    })

    expect((await repository.findById(id))?.mustChangePassword).toBe(false)
  })

  it('refuses two active people with the same username', async () => {
    await seedAdmin()
    const other = await repository.create({
      email: 'outro@local',
      name: 'Outro',
      image: null,
    })

    await expect(
      repository.setCredentials(other.id, { username: 'admin', passwordHash: 'x' }),
    ).rejects.toThrow()
  })

  it('frees the username after a soft delete', async () => {
    const id = await seedAdmin()
    await repository.softDelete(id)

    const other = await repository.create({
      email: 'outro@local',
      name: 'Outro',
      image: null,
    })

    await expect(
      repository.setCredentials(other.id, { username: 'admin', passwordHash: 'x' }),
    ).resolves.toBeDefined()
  })
})
