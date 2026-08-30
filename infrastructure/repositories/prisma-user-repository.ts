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

interface UserWhere {
  id?: UserId
  email?: string
  username?: string
  isManager?: boolean
  isActive?: boolean
  deletedAt: null
  OR?: readonly {
    name?: { contains: string; mode: 'insensitive' }
    email?: { contains: string; mode: 'insensitive' }
  }[]
}

type UpdateData = UpdateUserInput & {
  deletedAt?: Date
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
  isManager: true,
  isActive: true,
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

  async list(filters: UserFilters, page: PageRequest): Promise<Page<User>> {
    const where = buildWhere(filters)

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

function buildWhere(filters: UserFilters): UserWhere {
  const where: UserWhere = { deletedAt: null }

  if (filters.isManager !== undefined) where.isManager = filters.isManager
  if (filters.isActive !== undefined) where.isActive = filters.isActive

  const term = filters.search?.trim()
  if (term) {
    where.OR = [
      { name: { contains: term, mode: 'insensitive' } },
      { email: { contains: term, mode: 'insensitive' } },
    ]
  }

  return where
}
