import type { PageRequest, UserFilters, UserRole, UserStatus } from '@/shared/types'
import { DEFAULT_PAGE_SIZE } from '@/shared/types'
import { readNumber } from './query-params'

export interface UserQuery {
  filters: UserFilters
  page: PageRequest
}

/** Query string is user input: anything unrecognised is dropped, never guessed. */
export function parseUserQuery(params: URLSearchParams): UserQuery {
  const filters: UserFilters = {}

  const search = params.get('search')?.trim()
  if (search) filters.search = search

  const role = params.get('role')
  if (role === 'ADMIN' || role === 'MANAGER' || role === 'RESIDENT') {
    filters.role = role satisfies UserRole
  }

  for (const key of ['id', 'name', 'email'] as const) {
    const value = params.get(key)?.trim()
    if (value) filters[key] = value
  }

  const status = params.get('status')
  if (status === 'all' || status === 'active' || status === 'inactive') {
    filters.status = status satisfies UserStatus
  }

  return {
    filters,
    page: {
      page: readNumber(params.get('page'), 1),
      pageSize: readNumber(params.get('pageSize'), DEFAULT_PAGE_SIZE),
    },
  }
}
