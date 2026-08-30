import type {
  CondominiumId,
  CreateUserInput,
  Page,
  PageRequest,
  UpdateUserInput,
  User,
  UserFilters,
  UserId,
} from '@/shared/types'

/**
 * Which people the caller may see. Null sees everyone — that is the
 * administrator. A manager only sees who is in the condominiums they manage.
 */
export type UserScope = { inCondominiums: readonly CondominiumId[] } | null

export interface StoredCredentials {
  username?: string
  passwordHash: string
  mustChangePassword?: boolean
}

/**
 * Port. Implemented by infrastructure, consumed by use cases.
 *
 * Every read here excludes soft-deleted rows. Callers must not have to
 * remember that — see `.claude/rules/soft-delete.md`.
 */
export interface UserRepository {
  findById(id: UserId): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
  create(input: CreateUserInput): Promise<User>
  update(id: UserId, input: UpdateUserInput): Promise<User>
  findByUsername(username: string): Promise<User | null>
  setCredentials(id: UserId, credentials: StoredCredentials): Promise<User>
  /** Returns the stored hash, which never leaves the repository as part of `User`. */
  findPasswordHash(id: UserId): Promise<string | null>
  softDelete(id: UserId): Promise<void>
  /** Clears the exclusion. False when there is no such person. */
  restore(id: UserId): Promise<boolean>
  list(filters: UserFilters, page: PageRequest, scope?: UserScope): Promise<Page<User>>
}
