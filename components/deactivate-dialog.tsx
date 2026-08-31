'use client'

import { Button } from '@heroui/react'
import { useState } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { ResponsiveDialog } from '@/components/responsive-dialog'

export interface DeactivateDialogProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  title: string
  /** What the DELETE goes to. */
  endpoint: string
  /** What is shown when the server answers 403. */
  forbiddenMessage?: string
  children: ReactNode
  onDeleted: () => void
}

/** Deactivating is a DELETE: the row is only marked, never removed. */
export function DeactivateDialog({
  isOpen,
  onOpenChange,
  title,
  endpoint,
  forbiddenMessage,
  children,
  onDeleted,
}: DeactivateDialogProps): ReactElement {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function remove(): Promise<void> {
    setIsDeleting(true)
    setError(null)

    try {
      const response = await fetch(endpoint, { method: 'DELETE' })
      if (response.status === 403 && forbiddenMessage) {
        setError(forbiddenMessage)
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
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={title}
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
        {children}
        {error && (
          <p role="alert" className="text-danger text-sm">
            {error}
          </p>
        )}
      </div>
    </ResponsiveDialog>
  )
}
