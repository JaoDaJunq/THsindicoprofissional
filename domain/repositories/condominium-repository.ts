import type {
  Condominium,
  CondominiumFilters,
  CondominiumId,
  CreateCondominiumInput,
  Page,
  PageRequest,
  UpdateCondominiumInput,
} from '@/shared/types'

/**
 * Port. Implemented by infrastructure, consumed by use cases.
 *
 * Every read here excludes soft-deleted rows. Callers must not have to
 * remember that — see `.claude/rules/soft-delete.md`.
 */
export interface CondominiumRepository {
  findById(id: CondominiumId): Promise<Condominium | null>
  findByCnpj(cnpj: string): Promise<Condominium | null>
  create(input: CreateCondominiumInput): Promise<Condominium>
  update(id: CondominiumId, input: UpdateCondominiumInput): Promise<Condominium>
  softDelete(id: CondominiumId): Promise<void>
  /** Clears the exclusion. False when there is no such condominium. */
  restore(id: CondominiumId): Promise<boolean>
  list(filters: CondominiumFilters, page: PageRequest): Promise<Page<Condominium>>
}
