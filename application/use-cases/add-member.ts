import type { CondominiumRepository } from '@/domain/repositories/condominium-repository'
import type { MembershipRepository } from '@/domain/repositories/membership-repository'
import type { UserRepository } from '@/domain/repositories/user-repository'
import type { Membership, MembershipInput, Result } from '@/shared/types'
import { failure, success } from '@/shared/types'

export type AddMemberError = 'user-not-found' | 'condominium-not-found' | 'already-a-member'

/** Linking touches three tables, so the use case takes the three ports. */
export interface MembershipPorts {
  memberships: MembershipRepository
  users: UserRepository
  condominiums: CondominiumRepository
}

export async function addMember(
  { memberships, users, condominiums }: MembershipPorts,
  input: MembershipInput,
): Promise<Result<Membership, AddMemberError>> {
  if (!(await users.findById(input.userId))) return failure('user-not-found')

  if (!(await condominiums.findById(input.condominiumId))) {
    return failure('condominium-not-found')
  }

  if (await memberships.find(input.userId, input.condominiumId)) {
    return failure('already-a-member')
  }

  return success(await memberships.add(input))
}
