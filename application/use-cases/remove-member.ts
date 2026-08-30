import type { MembershipRepository } from '@/domain/repositories/membership-repository'
import type { CondominiumId, Result, UserId } from '@/shared/types'
import { failure, success } from '@/shared/types'

export type RemoveMemberError = 'membership-not-found'

export async function removeMember(
  memberships: MembershipRepository,
  userId: UserId,
  condominiumId: CondominiumId,
): Promise<Result<void, RemoveMemberError>> {
  if (!(await memberships.remove(userId, condominiumId))) {
    return failure('membership-not-found')
  }

  return success(undefined)
}
