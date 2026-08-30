/** Shared between server and client. Never import Prisma types from here. */

import type { CondominiumId } from './condominium'
import type { UserId } from './user'

/**
 * What someone is inside one condominium. Unrelated to `User.isManager`,
 * which is what grants write access to the system as a whole.
 */
export type CondominiumRole = 'RESIDENT' | 'MANAGER'

export interface Membership {
  id: string
  role: CondominiumRole
  user: { id: UserId; name: string | null; email: string }
  condominium: { id: CondominiumId; name: string }
}

export interface MembershipInput {
  userId: UserId
  condominiumId: CondominiumId
  role: CondominiumRole
}

/** One side is always fixed: either whose condominiums, or whose members. */
export type MembershipFilters =
  | { condominiumId: CondominiumId }
  | { userId: UserId }
