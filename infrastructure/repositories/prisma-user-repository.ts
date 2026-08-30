import type {
  StoredCredentials,
  UserRepository,
  UserScope,
} from '@/domain/repositories/user-repository'
import type {
  CondominiumId,
  CreateUserInput,
  Page,
  PageRequest,
  UpdateUserInput,
  User,
  UserFilters,
  UserId,
  UserRole,
} from '@/shared/types'

type TextMatch = { contains: string; mode: 'insensitive' }

interface MembershipFilter {
  some: { condominiumId: { in: readonly CondominiumId[] }; deletedAt: null }
}

interface UserWhere {
  memberships?: MembershipFilter
  id?: UserId
  email?: string | TextMatch
  name?: TextMatch
  username?: string
  role?: UserRole
  deletedAt?: null | { not: null }
  OR?: readonly {
    name?: TextMatch
    email?: TextMatch
  }[]
}

type UpdateData = UpdateUserInput & {
  deletedAt?: Date | null
  username?: string
  passwordHash?: string
  mustChangePassword?: boolean
}

/**
 * Explicit projection. Without it Prisma returns every column, and the password
 * hash would ride along inside `User` all the way to the browser.
 */
const USER_FIELDS = {
  id: true,
  email: true,
  name: true,
  image: true,
  username: true,
  mustChangePassword: true,
  role: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
} as const

type UserFields = typeof USER_FIELDS

/**
 * Only the slice of the Prisma user delegate this repository needs.
 * Narrow on purpose: keeps the tests free of a real database.
 */
export interface PrismaUserDelegate {
  findFirst(args: {
    where: UserWhere
    select?: UserFields | { passwordHash: true }
  }): Promise<(User & { passwordHash?: string | null }) | null>
  create(args: { data: CreateUserInput; select: UserFields }): Promise<User>
  update(args: {
    where: { id: UserId }
    data: UpdateData
    select: UserFields
  }): Promise<User>
  findMany(args: {
    where: UserWhere
    skip: number
    take: number
    orderBy: { createdAt: 'desc' }
    select: UserFields
  }): Promise<User[]>
  count(args: { where: UserWhere }): Promise<number>
  updateMany(args: { where: { id: UserId }; data: UpdateData }): Promise<{ count: number }>
}

/** Soft delete is enforced here so no caller has to remember it. */
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly delegate: PrismaUserDelegate) {}

  async findById(id: UserId): Promise<User | null> {
    return this.delegate.findFirst({ where: { id, deletedAt: null }, select: USER_FIELDS })
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.delegate.findFirst({ where: { email, deletedAt: null }, select: USER_FIELDS })
  }

  async create(input: CreateUserInput): Promise<User> {
    return this.delegate.create({ data: input, select: USER_FIELDS })
  }

  async update(id: UserId, input: UpdateUserInput): Promise<User> {
    return this.delegate.update({ where: { id }, data: input, select: USER_FIELDS })
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.delegate.findFirst({
      where: { username, deletedAt: null },
      select: USER_FIELDS,
    })
  }

  async setCredentials(id: UserId, credentials: StoredCredentials): Promise<User> {
    return this.delegate.update({
      where: { id },
      data: { ...credentials },
      select: USER_FIELDS,
    })
  }

  async findPasswordHash(id: UserId): Promise<string | null> {
    const found = await this.delegate.findFirst({
      where: { id, deletedAt: null },
      select: { passwordHash: true },
    })
    return found?.passwordHash ?? null
  }

  async softDelete(id: UserId): Promise<void> {
    await this.delegate.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: USER_FIELDS,
    })
  }

  async restore(id: UserId): Promise<boolean> {
    const { count } = await this.delegate.updateMany({
      where: { id },
      data: { deletedAt: null },
    })
    return count > 0
  }

  async list(
    filters: UserFilters,
    page: PageRequest,
    scope: UserScope = null,
  ): Promise<Page<User>> {
    const where = { ...buildWhere(filters), ...scopeWhere(scope) }

    const [items, total] = await Promise.all([
      this.delegate.findMany({
        where,
        skip: (page.page - 1) * page.pageSize,
        take: page.pageSize,
        orderBy: { createdAt: 'desc' },
        select: USER_FIELDS,
      }),
      this.delegate.count({ where }),
    ])

    return {
      items,
      total,
      page: page.page,
      pageSize: page.pageSize,
      pageCount: Math.max(1, Math.ceil(total / page.pageSize)),
    }
  }
}

/** The administrator has no scope; a manager reaches only their own people. */
function scopeWhere(scope: UserScope): { memberships?: MembershipFilter } {
  if (!scope) return {}

  return {
    memberships: { some: { condominiumId: { in: scope.inCondominiums }, deletedAt: null } },
  }
}

/**
 * Only a listing that says so sees excluded people: everywhere else the default
 * stands, as `.claude/rules/soft-delete.md` requires.
 */
function buildWhere(filters: UserFilters): UserWhere {
  const where: UserWhere = {}

  if (filters.status === 'inactive') where.deletedAt = { not: null }
  else if (filters.status !== 'all') where.deletedAt = null

  if (filters.role) where.role = filters.role
  if (filters.id) where.id = filters.id
  if (filters.name) where.name = { contains: filters.name, mode: 'insensitive' }
  if (filters.email) where.email = { contains: filters.email, mode: 'insensitive' }

  const term = filters.search?.trim()
  if (term) {
    where.OR = [
      { name: { contains: term, mode: 'insensitive' } },
      { email: { contains: term, mode: 'insensitive' } },
    ]
  }

  return where
}
