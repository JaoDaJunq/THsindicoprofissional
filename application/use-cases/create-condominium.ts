import type { CondominiumRepository } from '@/domain/repositories/condominium-repository'
import type { Condominium, CreateCondominiumInput, Result } from '@/shared/types'
import { failure, success } from '@/shared/types'
import { sanitizeCondominiumInput } from './condominium-input'
import type { CondominiumInputError } from './condominium-input'

export type CreateCondominiumError = CondominiumInputError | 'cnpj-already-registered'

export async function createCondominium(
  repository: CondominiumRepository,
  input: CreateCondominiumInput,
): Promise<Result<Condominium, CreateCondominiumError>> {
  const sanitized = sanitizeCondominiumInput(input)
  if (!sanitized.ok) return sanitized

  const { cnpj } = sanitized.value
  if (cnpj && (await repository.findByCnpj(cnpj))) return failure('cnpj-already-registered')

  return success(await repository.create(sanitized.value))
}
