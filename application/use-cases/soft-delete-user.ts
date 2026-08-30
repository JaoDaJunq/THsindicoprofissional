import type { UserRepository } from '@/domain/repositories/user-repository'
import type { Result, UserId } from '@/shared/types'
import { failure, success } from '@/shared/types'

export type SoftDeleteUserError = 'user-not-found' | 'cannot-delete-self'

export async function softDeleteUser(
  repository: UserRepository,
  id: UserId,
  requesterId: UserId,
): Promise<Result<void, SoftDeleteUserError>> {
  // Deleting your own account would lock you out of the session you are using.
  if (id === requesterId) return failure('cannot-delete-self')

  if (!(await repository.findById(id))) return failure('user-not-found')

  await repository.softDelete(id)
  return success(undefined)
}
