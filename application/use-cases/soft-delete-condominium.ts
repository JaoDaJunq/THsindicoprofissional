import type { CondominiumRepository } from '@/domain/repositories/condominium-repository'
import type { CondominiumId, Result } from '@/shared/types'
import { failure, success } from '@/shared/types'

export type SoftDeleteCondominiumError = 'condominium-not-found'

export async function softDeleteCondominium(
  repository: CondominiumRepository,
  id: CondominiumId,
): Promise<Result<void, SoftDeleteCondominiumError>> {
  if (!(await repository.findById(id))) return failure('condominium-not-found')

  await repository.softDelete(id)
  return success(undefined)
}
