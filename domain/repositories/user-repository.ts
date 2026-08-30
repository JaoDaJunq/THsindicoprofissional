import type {
  CreateUserInput,
  Page,
  PageRequest,
  UpdateUserInput,
  User,
  UserFilters,
  UserId,
} from '@/shared/types'

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
  list(filters: UserFilters, page: PageRequest): Promise<Page<User>>
}
