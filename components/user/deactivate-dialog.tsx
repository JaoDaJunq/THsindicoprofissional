'use client'

import type { ReactElement } from 'react'
import { DeactivateDialog } from '@/components/deactivate-dialog'
import type { User } from '@/shared/types'

export interface DeactivateUserDialogProps {
  user: User | null
  onOpenChange: (isOpen: boolean) => void
  onDeleted: () => void
}

export function DeactivateUserDialog({
  user,
  onOpenChange,
  onDeleted,
}: DeactivateUserDialogProps): ReactElement | null {
  if (!user) return null

  return (
    <DeactivateDialog
      isOpen
      onOpenChange={onOpenChange}
      title="Desativar usuário"
      endpoint={`/api/users/${user.id}`}
      forbiddenMessage="Você não pode desativar a sua própria conta."
      onDeleted={onDeleted}
    >
      <p className="text-sm">
        Desativar <strong>{user.name ?? user.email}</strong>? A pessoa deixa de entrar no
        sistema, mas o histórico dela é preservado e ela pode ser ativada de novo.
      </p>
    </DeactivateDialog>
  )
}
