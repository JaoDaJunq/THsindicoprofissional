import type { User } from '@/shared/types'

/**
 * One place that knows the shape of a User in tests. When the model gains a
 * field, only this file changes — not every fixture.
 */
export function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: '0b7d1c2e-4f5a-4b6c-8d9e-0f1a2b3c4d5e',
    email: 'ana@example.com',
    name: 'Ana Souza',
    image: null,
    username: null,
    mustChangePassword: false,
    isManager: false,
    deletedAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
    ...overrides,
  }
}
