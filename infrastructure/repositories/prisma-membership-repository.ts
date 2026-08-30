import type { MembershipRepository } from '@/domain/repositories/membership-repository'
import type {
  CondominiumId,
  CondominiumRole,
  Membership,
  MembershipFilters,
  MembershipInput,
  UserId,
} from '@/shared/types'

/** What the query brings back: the link plus the two sides it joins. */
export type MembershipRow = Membership

interface MembershipWhere {
  userId?: UserId
  condominiumId?: CondominiumId
  deletedAt: null
}

const SIDES = {
  user: { select: { id: true, name: true, email: true } },
  condominium: { select: { id: true, name: true } },
} as const

type Sides = typeof SIDES

/**
 * Only the slice of the Prisma delegate this repository needs.
 * Narrow on purpose: keeps the tests free of a real database.
 */
export interface PrismaMembershipDelegate {
  findFirst(args: { where: MembershipWhere; include: Sides }): Promise<MembershipRow | null>
  findMany(args: {
    where: MembershipWhere
    include: Sides
    orderBy: { createdAt: 'asc' }
  }): Promise<MembershipRow[]>
  create(args: { data: MembershipInput; include: Sides }): Promise<MembershipRow>
  updateMany(args: {
    where: MembershipWhere
    data: { deletedAt: Date } | { role: CondominiumRole }
  }): Promise<{ count: number }>
}

/** Soft delete is enforced here so no caller has to remember it. */
export class PrismaMembershipRepository implements MembershipRepository {
  constructor(private readonly delegate: PrismaMembershipDelegate) {}

  async list(filters: MembershipFilters): Promise<Membership[]> {
    return this.delegate.findMany({
      where: { ...filters, deletedAt: null },
      include: SIDES,
      orderBy: { createdAt: 'asc' },
    })
  }

  async find(userId: UserId, condominiumId: CondominiumId): Promise<Membership | null> {
    return this.delegate.findFirst({
      where: { userId, condominiumId, deletedAt: null },
      include: SIDES,
    })
  }

  async add(input: MembershipInput): Promise<Membership> {
    return this.delegate.create({ data: input, include: SIDES })
  }

  async setRole(
    userId: UserId,
    condominiumId: CondominiumId,
    role: CondominiumRole,
  ): Promise<Membership | null> {
    const { count } = await this.delegate.updateMany({
      where: { userId, condominiumId, deletedAt: null },
      data: { role },
    })

    return count > 0 ? this.find(userId, condominiumId) : null
  }

  async remove(userId: UserId, condominiumId: CondominiumId): Promise<boolean> {
    const { count } = await this.delegate.updateMany({
      where: { userId, condominiumId, deletedAt: null },
      data: { deletedAt: new Date() },
    })
    return count > 0
  }
}
