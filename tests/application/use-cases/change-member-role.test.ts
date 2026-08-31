import { changeMemberRole } from '@/application/use-cases/change-member-role'
import { InMemoryMembershipRepository } from '@/tests/support/in-memory-membership-repository'

const pair = { userId: 'u1', condominiumId: 'c1' }

describe('changeMemberRole', () => {
  it('promotes the member to manager of that condominium', async () => {
    const memberships = new InMemoryMembershipRepository()
    await memberships.add({ ...pair, role: 'RESIDENT' })

    const result = await changeMemberRole(memberships, pair.userId, pair.condominiumId, 'MANAGER')

    expect(result.ok && result.value.role).toBe('MANAGER')
  })

  it('reports a link that does not exist', async () => {
    const memberships = new InMemoryMembershipRepository()

    const result = await changeMemberRole(memberships, 'ghost', 'ghost', 'MANAGER')

    expect(result).toEqual({ ok: false, error: 'membership-not-found' })
  })
})
