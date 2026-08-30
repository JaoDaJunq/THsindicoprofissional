import argon2 from 'argon2'
import type { PasswordHasher } from '@/domain/security/password-hasher'

/** argon2id with the library defaults, which follow the OWASP recommendation. */
export class Argon2PasswordHasher implements PasswordHasher {
  async hash(plain: string): Promise<string> {
    return argon2.hash(plain, { type: argon2.argon2id })
  }

  async verify(hash: string, plain: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain)
    } catch {
      // A malformed stored hash must read as "wrong password", never as a crash.
      return false
    }
  }
}
