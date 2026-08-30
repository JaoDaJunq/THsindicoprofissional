import { administers, isAdmin } from '@/domain/authorization'
import type { CondominiumScope } from '@/domain/repositories/condominium-repository'
import { auth } from '@/infrastructure/auth/auth'
import { getMembershipRepository, getUserRepository } from '@/infrastructure/repositories'
import type { CondominiumId, User } from '@/shared/types'

/** Who is asking, as the database sees them. Null when nobody is signed in. */
export async function requester(): Promise<User | null> {
  const id = (await auth())?.user?.id
  if (!id) return null

  return getUserRepository().findById(id)
}

/** Everything that changes another person is a manager's job. */
export async function requireManager(): Promise<User | null> {
  const user = await requester()
  return user && user.role !== 'RESIDENT' ? user : null
}

/** Only the system administrator: creating a condominium is their call. */
export async function requireAdmin(): Promise<User | null> {
  const user = await requester()
  return user && isAdmin(user) ? user : null
}

/** The administrator, or the manager of this very condominium. */
export async function requireManagerOf(condominiumId: CondominiumId): Promise<User | null> {
  const user = await requester()
  if (!user) return null

  const memberships = await getMembershipRepository().list({ userId: user.id })
  return administers(user, memberships, condominiumId) ? user : null
}

/** What this person may see. The administrator sees everything. */
export function scopeOf(user: User): CondominiumScope {
  return isAdmin(user) ? null : { managedBy: user.id }
}

/** The condominiums this person manages, to scope other listings by. */
export async function managedCondominiumIds(user: User): Promise<CondominiumId[]> {
  const memberships = await getMembershipRepository().list({ userId: user.id })

  return memberships
    .filter((membership) => membership.role === 'MANAGER')
    .map((membership) => membership.condominium.id)
}
