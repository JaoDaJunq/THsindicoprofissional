'use client'

import { Chip } from '@heroui/react'
import type { ReactElement } from 'react'
import type { User } from '@/shared/types'

/** Being active is not a column of its own: an excluded person is an inactive one. */
export function StatusChip({ user }: { user: User }): ReactElement {
  const isActive = user.deletedAt === null

  return (
    <Chip variant={isActive ? 'primary' : 'soft'}>{isActive ? 'Ativo' : 'Inativo'}</Chip>
  )
}
