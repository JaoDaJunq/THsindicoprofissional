import type { CondominiumId, Membership, User } from '@/shared/types'

/** Runs the whole system: every condominium, every person. */
export function isAdmin(user: User): boolean {
  return user.role === 'ADMIN'
}

/**
 * The global role says what the person may do; the membership says where.
 * A MANAGER only manages the condominiums whose link says MANAGER — living
 * somewhere is not managing it.
 */
export function administers(
  user: User,
  memberships: readonly Membership[],
  condominiumId: CondominiumId,
): boolean {
  if (isAdmin(user)) return true
  if (user.role !== 'MANAGER') return false

  return memberships.some(
    (membership) =>
      membership.condominium.id === condominiumId && membership.role === 'MANAGER',
  )
}
