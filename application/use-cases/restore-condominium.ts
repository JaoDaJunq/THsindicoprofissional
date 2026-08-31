import type { CondominiumRepository } from '@/domain/repositories/condominium-repository'
import type { CondominiumId, Result } from '@/shared/types'
import { failure, success } from '@/shared/types'

export type RestoreCondominiumError = 'condominium-not-found'

/** Undoes the soft delete: the condominium goes back to being active. */
export async function restoreCondominium(
  repository: CondominiumRepository,
  id: CondominiumId,
): Promise<Result<void, RestoreCondominiumError>> {
  if (!(await repository.restore(id))) return failure('condominium-not-found')

  return success(undefined)
}
