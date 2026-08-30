import type { UserRepository } from '@/domain/repositories/user-repository'
import type { CreateUserInput, Result, User } from '@/shared/types'
import { failure, success } from '@/shared/types'

export type CreateUserError = 'invalid-email' | 'email-already-registered'

export async function createUser(
  repository: UserRepository,
  input: CreateUserInput,
): Promise<Result<User, CreateUserError>> {
  const email = input.email.trim().toLowerCase()

  if (!email.includes('@')) return failure('invalid-email')

  if (await repository.findByEmail(email)) return failure('email-already-registered')

  return success(await repository.create({ ...input, email }))
}
