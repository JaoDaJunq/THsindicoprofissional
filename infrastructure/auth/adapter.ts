import type { Adapter, AdapterUser } from 'next-auth/adapters'

interface UserLookup {
  findFirst(args: {
    where: { email: string; deletedAt: null }
  }): Promise<AdapterUser | null>
}


/**
 * `email` is not a unique column here: soft delete needs a partial unique index
 * so a removed person's address can be used again. The stock Prisma adapter
 * calls `findUnique` on it, which Prisma refuses — so this one method is swapped
 * for a `findFirst` that also skips soft-deleted rows.
 */
export function withSoftDeleteAwareLookup(base: Adapter, users: UserLookup): Adapter {
  return {
    ...base,
    getUserByEmail: (email: string): Promise<AdapterUser | null> =>
      users.findFirst({ where: { email, deletedAt: null } }),
  }
}
