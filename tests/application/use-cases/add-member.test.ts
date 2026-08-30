import { addMember } from '@/application/use-cases/add-member'
import { InMemoryCondominiumRepository } from '@/tests/support/in-memory-condominium-repository'
import { InMemoryMembershipRepository } from '@/tests/support/in-memory-membership-repository'
import { InMemoryUserRepository } from '@/tests/support/in-memory-user-repository'
import type { MembershipInput } from '@/shared/types'

async function scenario(): Promise<{
  memberships: InMemoryMembershipRepository
  users: InMemoryUserRepository
  condominiums: InMemoryCondominiumRepository
  input: MembershipInput
}> {
  const users = new InMemoryUserRepository()
  const condominiums = new InMemoryCondominiumRepository()
  const user = await users.create({ email: 'ana@example.com', name: 'Ana', image: null })
  const condominium = await condominiums.create({ name: 'Aurora', address: 'Rua A' })

  return {
    memberships: new InMemoryMembershipRepository(),
    users,
    condominiums,
    input: { userId: user.id, condominiumId: condominium.id, role: 'RESIDENT' },
  }
}

const add = (s: Awaited<ReturnType<typeof scenario>>, input = s.input) =>
  addMember({ memberships: s.memberships, users: s.users, condominiums: s.condominiums }, input)

describe('addMember', () => {
  it('links the person to the condominium', async () => {
    const s = await scenario()

    const result = await add(s)

    expect(result.ok && result.value.role).toBe('RESIDENT')
  })

  it('reports a person that does not exist', async () => {
    const s = await scenario()

    const result = await add(s, { ...s.input, userId: 'ghost' })

    expect(result).toEqual({ ok: false, error: 'user-not-found' })
  })

  it('reports a condominium that does not exist', async () => {
    const s = await scenario()

    const result = await add(s, { ...s.input, condominiumId: 'ghost' })

    expect(result).toEqual({ ok: false, error: 'condominium-not-found' })
  })

  it('refuses to link the same pair twice', async () => {
    const s = await scenario()
    await add(s)

    const result = await add(s)

    expect(result).toEqual({ ok: false, error: 'already-a-member' })
  })

  it('links the same person to another condominium', async () => {
    const s = await scenario()
    const other = await s.condominiums.create({ name: 'Vale Verde', address: 'Rua B' })
    await add(s)

    const result = await add(s, { ...s.input, condominiumId: other.id })

    expect(result.ok).toBe(true)
  })

  it('links the person again after they were unlinked', async () => {
    const s = await scenario()
    await add(s)
    await s.memberships.remove(s.input.userId, s.input.condominiumId)

    const result = await add(s)

    expect(result.ok).toBe(true)
  })
})
