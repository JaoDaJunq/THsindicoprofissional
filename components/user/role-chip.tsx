'use client'

import { Chip } from '@heroui/react'
import type { ReactElement } from 'react'
import type { UserRole } from '@/shared/types'

/** One place names the roles, so listing, filter and account card agree. */
export const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  MANAGER: 'Síndico',
  RESIDENT: 'Morador',
}

export function RoleChip({ role }: { role: UserRole }): ReactElement {
  return <Chip variant={role === 'RESIDENT' ? 'soft' : 'primary'}>{ROLE_LABEL[role]}</Chip>
}
