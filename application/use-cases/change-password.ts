import type { UserRepository } from '@/domain/repositories/user-repository'
import type { PasswordHasher } from '@/domain/security/password-hasher'
import type { Result, UserId } from '@/shared/types'
import { failure, success } from '@/shared/types'

export const MINIMUM_PASSWORD_LENGTH = 8

export type ChangePasswordError =
  | 'user-not-found'
  | 'invalid-credentials'
  | 'password-too-short'
  | 'password-unchanged'

export interface PasswordChange {
  currentPassword: string
  newPassword: string
}

export async function changePassword(
  repository: UserRepository,
  hasher: PasswordHasher,
  id: UserId,
  change: PasswordChange,
): Promise<Result<void, ChangePasswordError>> {
  const user = await repository.findById(id)
  if (!user) return failure('user-not-found')

  const hash = await repository.findPasswordHash(id)
  if (!hash) return failure('invalid-credentials')

  if (!(await hasher.verify(hash, change.currentPassword))) {
    return failure('invalid-credentials')
  }

  if (change.newPassword.length < MINIMUM_PASSWORD_LENGTH) {
    return failure('password-too-short')
  }

  if (change.newPassword === change.currentPassword) return failure('password-unchanged')

  await repository.setCredentials(id, {
    passwordHash: await hasher.hash(change.newPassword),
    mustChangePassword: false,
  })

  return success(undefined)
}
