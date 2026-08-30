'use client'

import { Button, Switch } from '@heroui/react'
import { useState } from 'react'
import type { ReactElement } from 'react'
import { ResponsiveDialog } from '@/components/responsive-dialog'
import type { UserFilters } from '@/shared/types'

export interface UserFiltersDialogProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  filters: UserFilters
  onApply: (filters: UserFilters) => void
}

/** Only offers the columns the table actually shows. */
export function UserFiltersDialog({
  isOpen,
  onOpenChange,
  filters,
  onApply,
}: UserFiltersDialogProps): ReactElement {
  const [draft, setDraft] = useState<UserFilters>(filters)

  function apply(): void {
    onApply(draft)
    onOpenChange(false)
  }

  function clear(): void {
    const empty: UserFilters = filters.search ? { search: filters.search } : {}
    setDraft(empty)
    onApply(empty)
    onOpenChange(false)
  }

  return (
    <ResponsiveDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title="Filtros"
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row">
          <Button variant="outline" className="w-full sm:flex-1" onPress={clear}>
            Limpar
          </Button>
          <Button variant="primary" className="w-full sm:flex-1" onPress={apply}>
            Aplicar
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 py-2">
        <Switch
          isSelected={draft.isManager === true}
          onChange={(isSelected: boolean) =>
            setDraft((current) => ({
              ...current,
              isManager: isSelected ? true : undefined,
            }))
          }
        >
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          <Switch.Content>Apenas síndicos</Switch.Content>
        </Switch>
        <Switch
          isSelected={draft.isActive === false}
          onChange={(isSelected: boolean) =>
            setDraft((current) => ({
              ...current,
              isActive: isSelected ? false : undefined,
            }))
          }
        >
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          <Switch.Content>Apenas inativos</Switch.Content>
        </Switch>
      </div>
    </ResponsiveDialog>
  )
}
