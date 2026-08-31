import type { CondominiumRepository } from '@/domain/repositories/condominium-repository'
import type { Condominium, CondominiumId, Result, UpdateCondominiumInput } from '@/shared/types'
import { failure, success } from '@/shared/types'
import { sanitizeCondominiumInput } from './condominium-input'
import type { CondominiumInputError } from './condominium-input'

export type UpdateCondominiumError =
  | CondominiumInputError
  | 'condominium-not-found'
  | 'cnpj-already-registered'

export async function updateCondominium(
  repository: CondominiumRepository,
  id: CondominiumId,
  input: UpdateCondominiumInput,
): Promise<Result<Condominium, UpdateCondominiumError>> {
  const sanitized = sanitizeCondominiumInput(input)
  if (!sanitized.ok) return sanitized

  if (!(await repository.findById(id))) return failure('condominium-not-found')

  const { cnpj } = sanitized.value
  if (cnpj) {
    const owner = await repository.findByCnpj(cnpj)
    if (owner && owner.id !== id) return failure('cnpj-already-registered')
  }

  return success(await repository.update(id, sanitized.value))
}
