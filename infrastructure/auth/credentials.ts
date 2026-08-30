import type { Credentials } from '@/application/use-cases/authenticate-user'

/** The form payload is untrusted input: anything unexpected becomes null. */
export function readCredentials(raw: unknown): Credentials | null {
  if (typeof raw !== 'object' || raw === null) return null

  const { username, password } = raw as Record<string, unknown>
  if (typeof username !== 'string' || typeof password !== 'string') return null

  const trimmed = username.trim()
  if (!trimmed || !password) return null

  return { username: trimmed, password }
}
