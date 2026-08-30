import type { MembershipRepository } from '@/domain/repositories/membership-repository'
import type {
  CondominiumId,
  CondominiumRole,
  Membership,
  Result,
  UserId,
} from '@/shared/types'
import { failure, success } from '@/shared/types'

export type ChangeMemberRoleError = 'membership-not-found'

/** Being the manager of a condominium is not the same as `User.isManager`. */
export async function changeMemberRole(
  memberships: MembershipRepository,
  userId: UserId,
  condominiumId: CondominiumId,
  role: CondominiumRole,
): Promise<Result<Membership, ChangeMemberRoleError>> {
  const updated = await memberships.setRole(userId, condominiumId, role)

  if (!updated) return failure('membership-not-found')

  return success(updated)
}
