import type { CondominiumRepository } from '@/domain/repositories/condominium-repository'
import type {
  Condominium,
  CondominiumFilters,
  Page,
  PageRequest,
  Result,
} from '@/shared/types'
import { MAX_PAGE_SIZE, failure, success } from '@/shared/types'

export type ListCondominiumsError = 'invalid-page' | 'invalid-page-size'

export async function listCondominiums(
  repository: CondominiumRepository,
  filters: CondominiumFilters,
  page: PageRequest,
): Promise<Result<Page<Condominium>, ListCondominiumsError>> {
  if (!Number.isInteger(page.page) || page.page < 1) return failure('invalid-page')

  if (!Number.isInteger(page.pageSize) || page.pageSize < 1 || page.pageSize > MAX_PAGE_SIZE) {
    return failure('invalid-page-size')
  }

  return success(await repository.list(filters, page))
}
