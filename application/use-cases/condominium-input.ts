import type { Result, UpdateCondominiumInput } from '@/shared/types'
import { failure, success } from '@/shared/types'

export type CondominiumInputError =
  | 'invalid-name'
  | 'invalid-address'
  | 'invalid-cnpj'
  | 'invalid-email'
  | 'invalid-count'

const COUNTS = ['unitsCount', 'blocksCount'] as const
const BLANK_ERROR = { name: 'invalid-name', address: 'invalid-address' } as const

/**
 * Same rules for creating and updating: trims text, keeps only the digits of
 * the cnpj, and turns a field left empty into null.
 */
export function sanitizeCondominiumInput<T extends UpdateCondominiumInput>(
  input: T,
): Result<T, CondominiumInputError> {
  const sanitized: T = { ...input }

  for (const field of ['name', 'address'] as const) {
    const value = input[field]
    if (value === undefined) continue
    if (value.trim() === '') return failure(BLANK_ERROR[field])
    sanitized[field] = value.trim()
  }

  if (input.cnpj !== undefined) {
    const digits = (input.cnpj ?? '').replace(/\D/g, '')
    if (digits !== '' && digits.length !== 14) return failure('invalid-cnpj')
    sanitized.cnpj = digits || null
  }

  if (input.email !== undefined) {
    const email = (input.email ?? '').trim().toLowerCase()
    if (email !== '' && !email.includes('@')) return failure('invalid-email')
    sanitized.email = email || null
  }

  if (input.phone !== undefined) sanitized.phone = input.phone?.trim() || null

  for (const field of COUNTS) {
    const value = input[field]
    if (value === undefined) continue
    if (!Number.isInteger(value) || value < 0) return failure('invalid-count')
  }

  return success(sanitized)
}
