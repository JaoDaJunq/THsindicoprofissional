import type { CondominiumId, Membership, User, UserId } from '@/shared/types'

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

/**
 * Editing a person's contact details: your own always, someone else's only if
 * you administer people at all.
 */
export function editsProfileOf(user: User, targetId: UserId): boolean {
  return user.id === targetId || user.role !== 'RESIDENT'
}

/**
 * Handing out power is the administrator's alone. Without this, opening the
 * profile to its owner would open self-promotion with it.
 */
export function assignsRole(user: User): boolean {
  return isAdmin(user)
}

/**
 * Seeing the system through someone else's eyes. Only the administrator, never
 * another administrator (there is nothing to see that they cannot already see,
 * and it would let one hide behind the other), and never themselves.
 */
export function impersonates(user: User, target: User): boolean {
  return isAdmin(user) && !isAdmin(target) && user.id !== target.id
}
