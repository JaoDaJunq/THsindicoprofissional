import { removeMember } from '@/application/use-cases/remove-member'
import { InMemoryMembershipRepository } from '@/tests/support/in-memory-membership-repository'

const input = { userId: 'user-1', condominiumId: 'condo-1', role: 'RESIDENT' } as const

describe('removeMember', () => {
  it('unlinks the person from the condominium', async () => {
    const memberships = new InMemoryMembershipRepository()
    await memberships.add(input)

    await removeMember(memberships, input.userId, input.condominiumId)

    expect(await memberships.find(input.userId, input.condominiumId)).toBeNull()
  })

  it('keeps the row and only marks it as deleted', async () => {
    const memberships = new InMemoryMembershipRepository()
    await memberships.add(input)

    await removeMember(memberships, input.userId, input.condominiumId)

    expect(memberships.rawCount()).toBe(1)
  })

  it('reports a link that does not exist', async () => {
    const memberships = new InMemoryMembershipRepository()

    const result = await removeMember(memberships, 'ghost', 'ghost')

    expect(result).toEqual({ ok: false, error: 'membership-not-found' })
  })
})
