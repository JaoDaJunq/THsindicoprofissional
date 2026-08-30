'use client'

import { Chip } from '@heroui/react'
import type { ReactElement } from 'react'

/** Being active is not a column of its own: an excluded row is an inactive one. */
export function StatusChip({ deletedAt }: { deletedAt: Date | null }): ReactElement {
  const isActive = deletedAt === null

  return <Chip variant={isActive ? 'primary' : 'soft'}>{isActive ? 'Ativo' : 'Inativo'}</Chip>
}
