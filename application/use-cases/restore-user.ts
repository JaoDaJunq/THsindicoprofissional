import type { UserRepository } from '@/domain/repositories/user-repository'
import type { Result, UserId } from '@/shared/types'
import { failure, success } from '@/shared/types'

export type RestoreUserError = 'user-not-found'

/** Undoes the soft delete: the person goes back to being active. */
export async function restoreUser(
  repository: UserRepository,
  id: UserId,
): Promise<Result<void, RestoreUserError>> {
  if (!(await repository.restore(id))) return failure('user-not-found')

  return success(undefined)
}
