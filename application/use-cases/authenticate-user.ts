import type { UserRepository } from '@/domain/repositories/user-repository'
import type { PasswordHasher } from '@/domain/security/password-hasher'
import type { Result, User } from '@/shared/types'
import { failure, success } from '@/shared/types'

export type AuthenticateUserError = 'invalid-credentials' | 'inactive-user'

export interface Credentials {
  username: string
  password: string
}

/**
 * A wrong username and a wrong password give the same answer on purpose:
 * telling them apart would let someone enumerate who exists.
 */
export async function authenticateUser(
  repository: UserRepository,
  hasher: PasswordHasher,
  credentials: Credentials,
): Promise<Result<User, AuthenticateUserError>> {
  const user = await repository.findByUsername(credentials.username)
  if (!user) return failure('invalid-credentials')

  const hash = await repository.findPasswordHash(user.id)
  if (!hash) return failure('invalid-credentials')

  if (!(await hasher.verify(hash, credentials.password))) {
    return failure('invalid-credentials')
  }

  if (!user.isActive) return failure('inactive-user')

  return success(user)
}
