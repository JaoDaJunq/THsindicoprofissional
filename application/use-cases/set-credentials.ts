import type { UserRepository } from '@/domain/repositories/user-repository'
import type { PasswordHasher } from '@/domain/security/password-hasher'
import type { Result, SetCredentialsInput, UserId } from '@/shared/types'
import { failure, success } from '@/shared/types'
import { MINIMUM_PASSWORD_LENGTH } from './change-password'

export type SetCredentialsError =
  | 'user-not-found'
  | 'invalid-username'
  | 'username-taken'
  | 'password-too-short'

/**
 * A manager hands someone a username and a first password. It is a password the
 * person did not choose, so they have to replace it on the first sign-in.
 */
export async function setCredentials(
  repository: UserRepository,
  hasher: PasswordHasher,
  id: UserId,
  input: SetCredentialsInput,
): Promise<Result<void, SetCredentialsError>> {
  const username = input.username.trim()

  if (!username) return failure('invalid-username')

  if (input.password.length < MINIMUM_PASSWORD_LENGTH) return failure('password-too-short')

  if (!(await repository.findById(id))) return failure('user-not-found')

  const owner = await repository.findByUsername(username)
  if (owner && owner.id !== id) return failure('username-taken')

  await repository.setCredentials(id, {
    username,
    passwordHash: await hasher.hash(input.password),
    mustChangePassword: true,
  })

  return success(undefined)
}
