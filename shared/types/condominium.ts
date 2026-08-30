/** Shared between server and client. Never import Prisma types from here. */

export type CondominiumId = string

export interface Condominium {
  id: CondominiumId
  name: string
  address: string
  cnpj: string | null
  phone: string | null
  email: string | null
  unitsCount: number
  blocksCount: number
  /** Counted live from the active memberships whose role is RESIDENT. */
  residentsCount: number
  /** Null while the condominium is active; the date it was excluded otherwise. */
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface CreateCondominiumInput {
  name: string
  address: string
  cnpj?: string | null
  phone?: string | null
  email?: string | null
  unitsCount?: number
  blocksCount?: number
}

export type UpdateCondominiumInput = Partial<CreateCondominiumInput>

/** Being active is not a column: it is whether the condominium was excluded. */
export type CondominiumStatus = 'all' | 'active' | 'inactive'

/** Mirrors the columns the table shows, so the UI can only filter what it displays. */
export interface CondominiumFilters {
  search?: string
  name?: string
  cnpj?: string
  status?: CondominiumStatus
}
