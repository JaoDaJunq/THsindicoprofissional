'use client'

import { Button, Input, Label, Separator, TextField } from '@heroui/react'
import { useState } from 'react'
import type { ReactElement } from 'react'
import { MembershipEditor } from '@/components/membership-editor'
import { ResponsiveDialog } from '@/components/responsive-dialog'
import type { Condominium, CreateCondominiumInput } from '@/shared/types'

export interface CondominiumFormDialogProps {
  isOpen: boolean
  /** Null creates a new one; a condominium edits that one. */
  condominium: Condominium | null
  onOpenChange: (isOpen: boolean) => void
  onSaved: () => void
}

interface Draft {
  name: string
  address: string
  cnpj: string
  phone: string
  email: string
  unitsCount: string
  blocksCount: string
}

const TEXT_FIELDS = [
  { key: 'name', label: 'Nome' },
  { key: 'address', label: 'Endereço' },
  { key: 'cnpj', label: 'CNPJ' },
  { key: 'phone', label: 'Telefone' },
  { key: 'email', label: 'E-mail' },
] as const

const COUNT_FIELDS = [
  { key: 'unitsCount', label: 'Unidades' },
  { key: 'blocksCount', label: 'Blocos' },
] as const

const FAILURE: Record<number, string> = {
  409: 'Já existe um condomínio com esse CNPJ.',
  400: 'Confira os campos: algum valor não foi aceito.',
  403: 'Só um síndico pode salvar um condomínio.',
}

function draftFrom(condominium: Condominium | null): Draft {
  return {
    name: condominium?.name ?? '',
    address: condominium?.address ?? '',
    cnpj: condominium?.cnpj ?? '',
    phone: condominium?.phone ?? '',
    email: condominium?.email ?? '',
    unitsCount: String(condominium?.unitsCount ?? ''),
    blocksCount: String(condominium?.blocksCount ?? ''),
  }
}

function toInput(draft: Draft): CreateCondominiumInput {
  return {
    name: draft.name,
    address: draft.address,
    cnpj: draft.cnpj,
    phone: draft.phone,
    email: draft.email,
    unitsCount: Number(draft.unitsCount) || 0,
    blocksCount: Number(draft.blocksCount) || 0,
  }
}

export function CondominiumFormDialog({
  isOpen,
  condominium,
  onOpenChange,
  onSaved,
}: CondominiumFormDialogProps): ReactElement {
  const [draft, setDraft] = useState<Draft>(() => draftFrom(condominium))
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(key: keyof Draft, value: string): void {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  async function save(): Promise<void> {
    if (draft.name.trim() === '') return setError('O nome é obrigatório.')
    if (draft.address.trim() === '') return setError('O endereço é obrigatório.')

    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch(
        condominium ? `/api/condominiums/${condominium.id}` : '/api/condominiums',
        {
          method: condominium ? 'PATCH' : 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(toInput(draft)),
        },
      )

      if (!response.ok) return setError(FAILURE[response.status] ?? 'Não foi possível salvar.')

      onSaved()
      onOpenChange(false)
    } catch {
      setError('Não foi possível salvar. Tente de novo.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <ResponsiveDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={condominium ? 'Editar condomínio' : 'Novo condomínio'}
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row">
          <Button variant="ghost" className="w-full sm:flex-1" onPress={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            className="w-full sm:flex-1"
            isPending={isSaving}
            onPress={() => void save()}
          >
            Salvar
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 py-2">
        {TEXT_FIELDS.map((field) => (
          <TextField
            key={field.key}
            variant="secondary"
            value={draft[field.key]}
            onChange={(value: string) => set(field.key, value)}
          >
            <Label>{field.label}</Label>
            <Input />
          </TextField>
        ))}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {COUNT_FIELDS.map((field) => (
            <TextField
              key={field.key}
              variant="secondary"
              value={draft[field.key]}
              onChange={(value: string) => set(field.key, value.replace(/\D/g, ''))}
            >
              <Label>{field.label}</Label>
              <Input inputMode="numeric" />
            </TextField>
          ))}
        </div>

        {condominium && (
          <section className="flex flex-col gap-3 pt-2">
            <Separator />
            <h3 className="text-sm font-semibold">Pessoas</h3>
            <MembershipEditor
              side={{ condominiumId: condominium.id }}
              resource="users"
              searchLabel="Buscar pessoa"
            />
          </section>
        )}

        {error && (
          <p role="alert" className="text-danger text-sm">
            {error}
          </p>
        )}
      </div>
    </ResponsiveDialog>
  )
}
