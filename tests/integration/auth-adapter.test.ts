import { PrismaAdapter } from '@auth/prisma-adapter'
import { withSoftDeleteAwareLookup } from '@/infrastructure/auth/adapter'
import { prisma, resetUsers } from './setup'

// This is the suite that would have caught the sign-in failure: the adapter
// runs its real queries against the real schema.
const adapter = withSoftDeleteAwareLookup(PrismaAdapter(prisma), prisma.user)

beforeEach(resetUsers)
afterAll(async () => {
  await resetUsers()
  await prisma.$disconnect()
})

const person = {
  email: 'ana@example.com',
  name: 'Ana Souza',
  image: null,
  emailVerified: null,
}

describe('auth adapter against the real database', () => {
  it('creates the user Google sends on first sign-in', async () => {
    const created = await adapter.createUser?.({ id: '', ...person })

    expect(created?.email).toBe('ana@example.com')
  })

  it('finds that user by e-mail on the next sign-in', async () => {
    await adapter.createUser?.({ id: '', ...person })

    const found = await adapter.getUserByEmail?.('ana@example.com')

    expect(found?.email).toBe('ana@example.com')
  })

  it('creates every new person as a resident, never as a manager', async () => {
    const created = await adapter.createUser?.({ id: '', ...person })
    const stored = await prisma.user.findFirstOrThrow({ where: { id: created?.id } })

    expect(stored.isManager).toBe(false)
    expect(stored.deletedAt).toBeNull()
  })

  it('gives every user a uuid', async () => {
    const created = await adapter.createUser?.({ id: '', ...person })

    expect(created?.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  })

  it('does not find a soft-deleted person, so they sign in as someone new', async () => {
    const created = await adapter.createUser?.({ id: '', ...person })
    await prisma.user.update({
      where: { id: created?.id },
      data: { deletedAt: new Date() },
    })

    expect(await adapter.getUserByEmail?.('ana@example.com')).toBeNull()
  })

  it('allows a new sign-up with the e-mail of a soft-deleted person', async () => {
    const created = await adapter.createUser?.({ id: '', ...person })
    await prisma.user.update({
      where: { id: created?.id },
      data: { deletedAt: new Date() },
    })

    const again = await adapter.createUser?.({ id: '', ...person })

    expect(again?.id).not.toBe(created?.id)
  })

  it('refuses two active people with the same e-mail', async () => {
    await adapter.createUser?.({ id: '', ...person })

    await expect(adapter.createUser?.({ id: '', ...person })).rejects.toThrow()
  })
})
