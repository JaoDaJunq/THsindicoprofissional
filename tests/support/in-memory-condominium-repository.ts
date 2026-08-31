import type {
  CondominiumRepository,
  CondominiumScope,
} from '@/domain/repositories/condominium-repository'
import type {
  Condominium,
  CondominiumFilters,
  CondominiumId,
  CreateCondominiumInput,
  Page,
  PageRequest,
  UpdateCondominiumInput,
} from '@/shared/types'

/** Test double. Keeps use-case tests free of a database. */
export class InMemoryCondominiumRepository implements CondominiumRepository {
  private readonly condominiums = new Map<CondominiumId, Condominium>()
  private readonly managers = new Map<CondominiumId, Set<string>>()
  private sequence = 0

  /** Test helper: says that this person manages this condominium. */
  linkManager(userId: string, condominiumId: CondominiumId): void {
    const managers = this.managers.get(condominiumId) ?? new Set<string>()
    managers.add(userId)
    this.managers.set(condominiumId, managers)
  }

  private isInScope(condominium: Condominium, scope: CondominiumScope): boolean {
    if (!scope) return true
    return this.managers.get(condominium.id)?.has(scope.managedBy) === true
  }

  /** Includes soft-deleted rows. Only tests asserting the delete strategy use it. */
  rawCount(): number {
    return this.condominiums.size
  }

  private active(): Condominium[] {
    return [...this.condominiums.values()].filter((it) => it.deletedAt === null)
  }

  async findById(
    id: CondominiumId,
    scope: CondominiumScope = null,
  ): Promise<Condominium | null> {
    const found = this.active().find((it) => it.id === id) ?? null
    return found && this.isInScope(found, scope) ? found : null
  }

  async findByCnpj(cnpj: string): Promise<Condominium | null> {
    return this.active().find((it) => it.cnpj === cnpj) ?? null
  }

  async create(input: CreateCondominiumInput): Promise<Condominium> {
    const now = new Date()
    const condominium: Condominium = {
      id: `00000000-0000-4000-8000-${String(++this.sequence).padStart(12, '0')}`,
      name: input.name,
      address: input.address,
      cnpj: input.cnpj ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      unitsCount: input.unitsCount ?? 0,
      blocksCount: input.blocksCount ?? 0,
      residentsCount: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }
    this.condominiums.set(condominium.id, condominium)
    return condominium
  }

  async update(id: CondominiumId, input: UpdateCondominiumInput): Promise<Condominium> {
    const current = this.condominiums.get(id)
    if (!current) throw new Error(`unknown condominium: ${id}`)

    const updated: Condominium = { ...current, ...input, updatedAt: new Date() }
    this.condominiums.set(id, updated)
    return updated
  }

  async softDelete(id: CondominiumId): Promise<void> {
    const current = this.condominiums.get(id)
    if (!current) return
    this.condominiums.set(id, { ...current, deletedAt: new Date() })
  }

  async restore(id: CondominiumId): Promise<boolean> {
    const current = this.condominiums.get(id)
    if (!current) return false
    this.condominiums.set(id, { ...current, deletedAt: null })
    return true
  }

  async list(
    filters: CondominiumFilters,
    page: PageRequest,
    scope: CondominiumScope = null,
  ): Promise<Page<Condominium>> {
    const term = filters.search?.trim().toLowerCase() ?? ''
    const pool =
      filters.status === 'all'
        ? [...this.condominiums.values()]
        : filters.status === 'inactive'
          ? [...this.condominiums.values()].filter((it) => it.deletedAt !== null)
          : this.active()

    const matching = pool.filter((it) => {
      if (!this.isInScope(it, scope)) return false
      if (filters.name && !it.name.toLowerCase().includes(filters.name.toLowerCase()))
        return false
      if (filters.cnpj && !(it.cnpj ?? '').includes(filters.cnpj)) return false
      if (!term) return true
      return (
        it.name.toLowerCase().includes(term) ||
        it.address.toLowerCase().includes(term) ||
        (it.cnpj ?? '').includes(term)
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
