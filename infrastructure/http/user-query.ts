import type { PageRequest, UserFilters } from '@/shared/types'
import { DEFAULT_PAGE_SIZE } from '@/shared/types'

export interface UserQuery {
  filters: UserFilters
  page: PageRequest
}

function readFlag(raw: string | null): boolean | undefined {
  if (raw === 'true') return true
  if (raw === 'false') return false
  return undefined
}

function readNumber(raw: string | null, fallback: number): number {
  const parsed = Number(raw)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

/** Query string is user input: anything unrecognised is dropped, never guessed. */
export function parseUserQuery(params: URLSearchParams): UserQuery {
  const filters: UserFilters = {}

  const search = params.get('search')?.trim()
  if (search) filters.search = search

  const isManager = readFlag(params.get('isManager'))
  if (isManager !== undefined) filters.isManager = isManager

  const isActive = readFlag(params.get('isActive'))
  if (isActive !== undefined) filters.isActive = isActive

  return {
    filters,
    page: {
      page: readNumber(params.get('page'), 1),
      pageSize: readNumber(params.get('pageSize'), DEFAULT_PAGE_SIZE),
    },
  }
}
