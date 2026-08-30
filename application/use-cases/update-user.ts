import type { UserRepository } from '@/domain/repositories/user-repository'
import type { Result, UpdateUserInput, User, UserId } from '@/shared/types'
import { failure, success } from '@/shared/types'

export type UpdateUserError = 'user-not-found' | 'invalid-name'

export async function updateUser(
  repository: UserRepository,
  id: UserId,
  input: UpdateUserInput,
): Promise<Result<User, UpdateUserError>> {
  if (typeof input.name === 'string' && input.name.trim() === '') {
    return failure('invalid-name')
  }

  if (!(await repository.findById(id))) return failure('user-not-found')

  return success(await repository.update(id, input))
}
