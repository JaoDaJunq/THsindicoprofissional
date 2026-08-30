'use client'

import { Button, Input, Label, Radio, RadioGroup, Switch, TextField } from '@heroui/react'
import { useState } from 'react'
import type { ReactElement } from 'react'
import { ResponsiveDialog } from '@/components/responsive-dialog'
import type { UserFilters, UserStatus } from '@/shared/types'

export interface UserFiltersDialogProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  filters: UserFilters
  onApply: (filters: UserFilters) => void
}

const STATUSES: { id: UserStatus; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'active', label: 'Ativos' },
  { id: 'inactive', label: 'Inativos' },
]

function Field({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}): ReactElement {
  return (
    <TextField variant="secondary" value={value} onChange={onChange}>
      <Label>{label}</Label>
      <Input />
    </TextField>
  )
}

/** Only offers the columns the table actually shows. */
export function UserFiltersDialog({
  isOpen,
  onOpenChange,
  filters,
  onApply,
}: UserFiltersDialogProps): ReactElement {
  const [draft, setDraft] = useState<UserFilters>({ status: 'all', ...filters })

  function set(change: Partial<UserFilters>): void {
    setDraft((current) => ({ ...current, ...change }))
  }

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
        <Field label="Código" value={draft.id ?? ''} onChange={(id) => set({ id: id || undefined })} />
        <Field
          label="Nome"
          value={draft.name ?? ''}
          onChange={(name) => set({ name: name || undefined })}
        />
        <Field
          label="E-mail"
          value={draft.email ?? ''}
          onChange={(email) => set({ email: email || undefined })}
        />

        <RadioGroup
          value={draft.status ?? 'all'}
          onChange={(status: string) => set({ status: status as UserStatus })}
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

        <Switch
          isSelected={draft.isManager === true}
          onChange={(isSelected: boolean) => set({ isManager: isSelected ? true : undefined })}
        >
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          <Switch.Content>Apenas síndicos</Switch.Content>
        </Switch>
      </div>
    </ResponsiveDialog>
  )
}
