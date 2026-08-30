'use client'

import { Button } from '@heroui/react'
import { useState } from 'react'
import type { ReactElement } from 'react'
import { ResponsiveDialog } from '@/components/responsive-dialog'
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
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!user) return null

  const { id, name, email } = user

  async function remove(): Promise<void> {
    setIsDeleting(true)
    setError(null)

    try {
      const response = await fetch(`/api/users/${id}`, { method: 'DELETE' })
      if (response.status === 403) {
        setError('Você não pode desativar a sua própria conta.')
        return
      }
      if (!response.ok) throw new Error('request-failed')
      onDeleted()
      onOpenChange(false)
    } catch {
      setError('Não foi possível desativar. Tente de novo.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <ResponsiveDialog
      isOpen
      onOpenChange={onOpenChange}
      title="Desativar usuário"
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row">
          <Button variant="ghost" className="w-full sm:flex-1" onPress={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            className="w-full sm:flex-1"
            isPending={isDeleting}
            onPress={() => void remove()}
          >
            Desativar
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-2 py-2">
        <p className="text-sm">
          Desativar <strong>{name ?? email}</strong>? A pessoa deixa de entrar no
          sistema, mas o histórico dela é preservado e ela pode ser ativada de novo.
        </p>
        {error && (
          <p role="alert" className="text-danger text-sm">
            {error}
          </p>
        )}
      </div>
    </ResponsiveDialog>
  )
}
