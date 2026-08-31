'use client'

import { Button, Input, Label, Radio, RadioGroup, TextField } from '@heroui/react'
import { useState } from 'react'
import type { ReactElement } from 'react'
import { ResponsiveDialog } from '@/components/responsive-dialog'
import type { CondominiumFilters, CondominiumStatus } from '@/shared/types'

export interface CondominiumFiltersDialogProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  filters: CondominiumFilters
  onApply: (filters: CondominiumFilters) => void
}

const STATUSES: { id: CondominiumStatus; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'active', label: 'Ativos' },
  { id: 'inactive', label: 'Inativos' },
]

/** Only offers the columns the table actually shows. */
export function CondominiumFiltersDialog({
  isOpen,
  onOpenChange,
  filters,
  onApply,
}: CondominiumFiltersDialogProps): ReactElement {
  const [draft, setDraft] = useState<CondominiumFilters>({ status: 'all', ...filters })

  function set(change: Partial<CondominiumFilters>): void {
    setDraft((current) => ({ ...current, ...change }))
  }

  function apply(): void {
    onApply(draft)
    onOpenChange(false)
  }

  function clear(): void {
    const empty: CondominiumFilters = filters.search ? { search: filters.search } : {}
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
          <Button variant="ghost" className="w-full sm:flex-1" onPress={clear}>
            Limpar
          </Button>
          <Button variant="primary" className="w-full sm:flex-1" onPress={apply}>
            Aplicar
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 py-2">
        <TextField
          variant="secondary"
          value={draft.name ?? ''}
          onChange={(name: string) => set({ name: name || undefined })}
        >
          <Label>Nome</Label>
          <Input />
        </TextField>

        <TextField
          variant="secondary"
          value={draft.cnpj ?? ''}
          onChange={(cnpj: string) => set({ cnpj: cnpj || undefined })}
        >
          <Label>CNPJ</Label>
          <Input />
        </TextField>

        <RadioGroup
          variant="secondary"
          value={draft.status ?? 'all'}
          onChange={(status: string) => set({ status: status as CondominiumStatus })}
        >
          <Label>Status</Label>
          <div className="flex gap-4">
            {STATUSES.map((status) => (
              <Radio key={status.id} value={status.id}>
                <Radio.Control>
                  <Radio.Indicator />
                </Radio.Control>
                <Radio.Content>{status.label}</Radio.Content>
              </Radio>
            ))}
          </div>
        </RadioGroup>
      </div>
    </ResponsiveDialog>
  )
}
