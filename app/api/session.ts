import { auth } from '@/infrastructure/auth/auth'
import { getUserRepository } from '@/infrastructure/repositories'
import type { User } from '@/shared/types'

/** Who is asking, as the database sees them. Null when nobody is signed in. */
export async function requester(): Promise<User | null> {
  const id = (await auth())?.user?.id
  if (!id) return null

  return getUserRepository().findById(id)
}

/** Everything that changes another person is a manager's job. */
export async function requireManager(): Promise<User | null> {
  const user = await requester()
  return user?.isManager ? user : null
}
