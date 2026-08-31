import type { UserRepository } from '@/domain/repositories/user-repository'
import type { Result, UpdateUserInput, User, UserId } from '@/shared/types'
import { failure, success } from '@/shared/types'

export type UpdateUserError =
  | 'user-not-found'
  | 'invalid-name'
  | 'invalid-email'
  | 'email-already-registered'

export async function updateUser(
  repository: UserRepository,
  id: UserId,
  input: UpdateUserInput,
): Promise<Result<User, UpdateUserError>> {
  if (typeof input.name === 'string' && input.name.trim() === '') {
    return failure('invalid-name')
  }

  if (!(await repository.findById(id))) return failure('user-not-found')

  const email = input.email?.trim().toLowerCase()

  if (email !== undefined) {
    if (!email.includes('@')) return failure('invalid-email')

    const owner = await repository.findByEmail(email)
    if (owner && owner.id !== id) return failure('email-already-registered')
  }

  return success(await repository.update(id, { ...input, ...(email && { email }) }))
}
