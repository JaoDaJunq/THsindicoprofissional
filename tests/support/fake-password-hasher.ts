import type { PasswordHasher } from '@/domain/security/password-hasher'

/** Test double: reversible on purpose, so tests stay fast and predictable. */
export class FakePasswordHasher implements PasswordHasher {
  async hash(plain: string): Promise<string> {
    return `hashed:${plain}`
  }

  async verify(hash: string, plain: string): Promise<boolean> {
    return hash === `hashed:${plain}`
  }
}
