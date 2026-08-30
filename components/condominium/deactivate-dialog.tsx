'use client'

import type { ReactElement } from 'react'
import { DeactivateDialog } from '@/components/deactivate-dialog'
import type { Condominium } from '@/shared/types'

export interface DeactivateCondominiumDialogProps {
  condominium: Condominium | null
  onOpenChange: (isOpen: boolean) => void
  onDeleted: () => void
}

export function DeactivateCondominiumDialog({
  condominium,
  onOpenChange,
  onDeleted,
}: DeactivateCondominiumDialogProps): ReactElement | null {
  if (!condominium) return null

  return (
    <DeactivateDialog
      isOpen
      onOpenChange={onOpenChange}
      title="Desativar condomínio"
      endpoint={`/api/condominiums/${condominium.id}`}
      onDeleted={onDeleted}
    >
      <p className="text-sm">
        Desativar <strong>{condominium.name}</strong>? Ele sai das listagens, mas o
        histórico é preservado e ele pode ser ativado de novo.
      </p>
    </DeactivateDialog>
  )
}
