import type { UserRepository } from '@/domain/repositories/user-repository'
import type { Page, PageRequest, Result, User, UserFilters } from '@/shared/types'
import { MAX_PAGE_SIZE, failure, success } from '@/shared/types'

export type ListUsersError = 'invalid-page' | 'invalid-page-size'

export async function listUsers(
  repository: UserRepository,
  filters: UserFilters,
  page: PageRequest,
): Promise<Result<Page<User>, ListUsersError>> {
  if (!Number.isInteger(page.page) || page.page < 1) return failure('invalid-page')

  if (!Number.isInteger(page.pageSize) || page.pageSize < 1 || page.pageSize > MAX_PAGE_SIZE) {
    return failure('invalid-page-size')
  }

  return success(await repository.list(filters, page))
}
