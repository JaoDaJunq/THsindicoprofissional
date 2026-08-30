import type {
  StoredCredentials,
  UserRepository,
} from '@/domain/repositories/user-repository'
import type {
  CreateUserInput,
  Page,
  PageRequest,
  UpdateUserInput,
  User,
  UserFilters,
  UserId,
} from '@/shared/types'

interface StoredUser extends User {
  passwordHash: string | null
}

/** Test double. Keeps use-case tests free of a database. */
export class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map<UserId, StoredUser>()
  private sequence = 0

  /** Includes soft-deleted rows. Only tests asserting the delete strategy use it. */
  rawCount(): number {
    return this.users.size
  }

  private active(): StoredUser[] {
    return [...this.users.values()].filter((user) => user.deletedAt === null)
  }

  async findById(id: UserId): Promise<User | null> {
    return this.active().find((user) => user.id === id) ?? null
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.active().find((user) => user.email === email) ?? null
  }

  async create(input: CreateUserInput): Promise<User> {
    const now = new Date()
    const user: StoredUser = {
      id: `00000000-0000-4000-8000-${String(++this.sequence).padStart(12, '0')}`,
      email: input.email,
      name: input.name,
      image: input.image,
      username: null,
      mustChangePassword: false,
      passwordHash: null,
      isManager: false,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }
    this.users.set(user.id, user)
    return user
  }

  async update(id: UserId, input: UpdateUserInput): Promise<User> {
    const current = this.users.get(id)
    if (!current) throw new Error(`unknown user: ${id}`)

    const updated: StoredUser = {
      ...current,
      name: input.name === undefined ? current.name : input.name,
      email: input.email ?? current.email,
      image: input.image === undefined ? current.image : input.image,
      isManager: input.isManager ?? current.isManager,
      updatedAt: new Date(),
    }
    this.users.set(id, updated)
    return updated
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.active().find((user) => user.username === username) ?? null
  }

  async setCredentials(id: UserId, credentials: StoredCredentials): Promise<User> {
    const current = this.users.get(id)
    if (!current) throw new Error(`unknown user: ${id}`)

    const updated: StoredUser = {
      ...current,
      username: credentials.username ?? current.username,
      passwordHash: credentials.passwordHash,
      mustChangePassword: credentials.mustChangePassword ?? current.mustChangePassword,
      updatedAt: new Date(),
    }
    this.users.set(id, updated)
    return updated
  }

  async findPasswordHash(id: UserId): Promise<string | null> {
    return this.users.get(id)?.passwordHash ?? null
  }

  async softDelete(id: UserId): Promise<void> {
    const current = this.users.get(id)
    if (!current) return
    this.users.set(id, { ...current, deletedAt: new Date() })
  }

  async restore(id: UserId): Promise<boolean> {
    const current = this.users.get(id)
    if (!current) return false
    this.users.set(id, { ...current, deletedAt: null })
    return true
  }

  async list(filters: UserFilters, page: PageRequest): Promise<Page<User>> {
    const term = filters.search?.trim().toLowerCase() ?? ''
    const pool =
      filters.status === 'all'
        ? [...this.users.values()]
        : filters.status === 'inactive'
          ? [...this.users.values()].filter((user) => user.deletedAt !== null)
          : this.active()

    const matching = pool.filter((user) => {
      if (filters.isManager !== undefined && user.isManager !== filters.isManager) return false
      if (filters.id && user.id !== filters.id) return false
      if (filters.name && !(user.name ?? '').toLowerCase().includes(filters.name.toLowerCase()))
        return false
      if (filters.email && !user.email.toLowerCase().includes(filters.email.toLowerCase()))
        return false
      if (!term) return true
      return (
        user.email.toLowerCase().includes(term) ||
        (user.name ?? '').toLowerCase().includes(term)
      )
    })

    const start = (page.page - 1) * page.pageSize
    return {
      items: matching.slice(start, start + page.pageSize),
      total: matching.length,
      page: page.page,
      pageSize: page.pageSize,
      pageCount: Math.max(1, Math.ceil(matching.length / page.pageSize)),
    }
  }
}
