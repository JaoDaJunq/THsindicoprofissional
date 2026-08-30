import type { MembershipRepository } from '@/domain/repositories/membership-repository'
import type {
  CondominiumRole,
  Membership,
  MembershipFilters,
  MembershipInput,
} from '@/shared/types'

interface StoredMembership extends Membership {
  deletedAt: Date | null
}

/** Test double. Keeps use-case tests free of a database. */
export class InMemoryMembershipRepository implements MembershipRepository {
  private readonly memberships: StoredMembership[] = []
  private sequence = 0

  /** Includes soft-deleted links. Only tests asserting the delete strategy use it. */
  rawCount(): number {
    return this.memberships.length
  }

  private active(): StoredMembership[] {
    return this.memberships.filter((it) => it.deletedAt === null)
  }

  async list(filters: MembershipFilters): Promise<Membership[]> {
    return this.active().filter((it) =>
      'userId' in filters
        ? it.user.id === filters.userId
        : it.condominium.id === filters.condominiumId,
    )
  }

  async find(userId: string, condominiumId: string): Promise<Membership | null> {
    return (
      this.active().find(
        (it) => it.user.id === userId && it.condominium.id === condominiumId,
      ) ?? null
    )
  }

  async add(input: MembershipInput): Promise<Membership> {
    const membership: StoredMembership = {
      id: `00000000-0000-4000-8000-${String(++this.sequence).padStart(12, '0')}`,
      role: input.role,
      user: { id: input.userId, name: null, email: `${input.userId}@example.com` },
      condominium: { id: input.condominiumId, name: input.condominiumId },
      deletedAt: null,
    }
    this.memberships.push(membership)
    return membership
  }

  async setRole(
    userId: string,
    condominiumId: string,
    role: CondominiumRole,
  ): Promise<Membership | null> {
    const found = await this.find(userId, condominiumId)
    if (!found) return null

    found.role = role
    return found
  }

  async remove(userId: string, condominiumId: string): Promise<boolean> {
    const found = this.active().find(
      (it) => it.user.id === userId && it.condominium.id === condominiumId,
    )
    if (!found) return false

    found.deletedAt = new Date()
    return true
  }
}
