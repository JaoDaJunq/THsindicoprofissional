import type { CondominiumRepository } from '@/domain/repositories/condominium-repository'
import type {
  Condominium,
  CondominiumFilters,
  CondominiumId,
  CreateCondominiumInput,
  Page,
  PageRequest,
  UpdateCondominiumInput,
} from '@/shared/types'

type TextMatch = { contains: string; mode: 'insensitive' }

export interface CondominiumWhere {
  id?: CondominiumId
  cnpj?: string | TextMatch
  name?: TextMatch
  deletedAt?: null | { not: null }
  OR?: readonly { name?: TextMatch; address?: TextMatch; cnpj?: TextMatch }[]
}

type UpdateData = UpdateCondominiumInput & { deletedAt?: Date | null }

/** What the table stores, plus the residents counted alongside it. */
export type CondominiumRow = Omit<Condominium, 'residentsCount'> & {
  _count: { members: number }
}

/** Residents are the active links whose role is RESIDENT — never the excluded ones. */
const COUNT_RESIDENTS = {
  _count: { select: { members: { where: { deletedAt: null, role: 'RESIDENT' } } } },
} as const

type CountResidents = typeof COUNT_RESIDENTS

function toCondominium({ _count, ...columns }: CondominiumRow): Condominium {
  return { ...columns, residentsCount: _count.members }
}

/**
 * Only the slice of the Prisma delegate this repository needs.
 * Narrow on purpose: keeps the tests free of a real database.
 */
export interface PrismaCondominiumDelegate {
  findFirst(args: {
    where: CondominiumWhere
    include: CountResidents
  }): Promise<CondominiumRow | null>
  create(args: {
    data: CreateCondominiumInput
    include: CountResidents
  }): Promise<CondominiumRow>
  update(args: {
    where: { id: CondominiumId }
    data: UpdateData
    include: CountResidents
  }): Promise<CondominiumRow>
  findMany(args: {
    where: CondominiumWhere
    skip: number
    take: number
    orderBy: { name: 'asc' }
    include: CountResidents
  }): Promise<CondominiumRow[]>
  count(args: { where: CondominiumWhere }): Promise<number>
  updateMany(args: {
    where: { id: CondominiumId }
    data: UpdateData
  }): Promise<{ count: number }>
}

/** Soft delete is enforced here so no caller has to remember it. */
export class PrismaCondominiumRepository implements CondominiumRepository {
  constructor(private readonly delegate: PrismaCondominiumDelegate) {}

  private async findOne(where: CondominiumWhere): Promise<Condominium | null> {
    const found = await this.delegate.findFirst({ where, include: COUNT_RESIDENTS })
    return found && toCondominium(found)
  }

  async findById(id: CondominiumId): Promise<Condominium | null> {
    return this.findOne({ id, deletedAt: null })
  }

  async findByCnpj(cnpj: string): Promise<Condominium | null> {
    return this.findOne({ cnpj, deletedAt: null })
  }

  async create(input: CreateCondominiumInput): Promise<Condominium> {
    return toCondominium(await this.delegate.create({ data: input, include: COUNT_RESIDENTS }))
  }

  async update(id: CondominiumId, input: UpdateCondominiumInput): Promise<Condominium> {
    return toCondominium(
      await this.delegate.update({ where: { id }, data: input, include: COUNT_RESIDENTS }),
    )
  }

  async softDelete(id: CondominiumId): Promise<void> {
    await this.delegate.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: COUNT_RESIDENTS,
    })
  }

  async restore(id: CondominiumId): Promise<boolean> {
    const { count } = await this.delegate.updateMany({
      where: { id },
      data: { deletedAt: null },
    })
    return count > 0
  }

  async list(filters: CondominiumFilters, page: PageRequest): Promise<Page<Condominium>> {
    const where = buildWhere(filters)

    const [items, total] = await Promise.all([
      this.delegate.findMany({
        where,
        skip: (page.page - 1) * page.pageSize,
        take: page.pageSize,
        orderBy: { name: 'asc' },
        include: COUNT_RESIDENTS,
      }),
      this.delegate.count({ where }),
    ])

    return {
      items: items.map(toCondominium),
      total,
      page: page.page,
      pageSize: page.pageSize,
      pageCount: Math.max(1, Math.ceil(total / page.pageSize)),
    }
  }
}

/**
 * Only a listing that says so sees excluded rows: everywhere else the default
 * stands, as `.claude/rules/soft-delete.md` requires.
 */
function buildWhere(filters: CondominiumFilters): CondominiumWhere {
  const where: CondominiumWhere = {}

  if (filters.status === 'inactive') where.deletedAt = { not: null }
  else if (filters.status !== 'all') where.deletedAt = null

  if (filters.name) where.name = { contains: filters.name, mode: 'insensitive' }
  if (filters.cnpj) where.cnpj = { contains: filters.cnpj, mode: 'insensitive' }

  const term = filters.search?.trim()
  if (term) {
    where.OR = [
      { name: { contains: term, mode: 'insensitive' } },
      { address: { contains: term, mode: 'insensitive' } },
      { cnpj: { contains: term, mode: 'insensitive' } },
    ]
  }

  return where
}
