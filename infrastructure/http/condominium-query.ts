import type { CondominiumFilters, CondominiumStatus, PageRequest } from '@/shared/types'
import { DEFAULT_PAGE_SIZE } from '@/shared/types'
import { readNumber } from './query-params'

export interface CondominiumQuery {
  filters: CondominiumFilters
  page: PageRequest
}

/** Query string is user input: anything unrecognised is dropped, never guessed. */
export function parseCondominiumQuery(params: URLSearchParams): CondominiumQuery {
  const filters: CondominiumFilters = {}

  for (const key of ['search', 'name', 'cnpj'] as const) {
    const value = params.get(key)?.trim()
    if (value) filters[key] = value
  }

  const status = params.get('status')
  if (status === 'all' || status === 'active' || status === 'inactive') {
    filters.status = status satisfies CondominiumStatus
  }

  return {
    filters,
    page: {
      page: readNumber(params.get('page'), 1),
      pageSize: readNumber(params.get('pageSize'), DEFAULT_PAGE_SIZE),
    },
  }
}
