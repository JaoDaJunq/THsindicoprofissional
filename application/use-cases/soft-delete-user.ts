import type { UserRepository } from '@/domain/repositories/user-repository'
import type { Result, UserId } from '@/shared/types'
import { failure, success } from '@/shared/types'

export type SoftDeleteUserError = 'user-not-found'

export async function softDeleteUser(
  repository: UserRepository,
  id: UserId,
): Promise<Result<void, SoftDeleteUserError>> {
  if (!(await repository.findById(id))) return failure('user-not-found')

  await repository.softDelete(id)
  return success(undefined)
}
