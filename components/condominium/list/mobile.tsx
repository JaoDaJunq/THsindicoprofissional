'use client'

import { Accordion, Button } from '@heroui/react'
import type { ReactElement } from 'react'
import { StatusChip } from '@/components/status-chip'
import { formatCnpj } from '../format'
import type { Condominium } from '@/shared/types'

export interface CondominiumListProps {
  condominiums: readonly Condominium[]
  firstIndex: number
  onEdit: (condominium: Condominium) => void
  onDeactivate: (condominium: Condominium) => void
  onActivate: (condominium: Condominium) => void
}

function Field({
  label,
  children,
}: {
  label: string
  children: ReactElement | string
}): ReactElement {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-default-500">{label}</dt>
      <dd className="truncate">{children}</dd>
    </div>
  )
}

/** On a phone a row of columns does not fit; each condominium becomes a panel. */
export function CondominiumListMobile({
  condominiums,
  firstIndex,
  onEdit,
  onDeactivate,
  onActivate,
}: CondominiumListProps): ReactElement {
  if (condominiums.length === 0) {
    return (
      <p className="text-default-500 py-8 text-center text-sm">
        Nenhum condomínio encontrado.
      </p>
    )
  }

  return (
    <Accordion variant="surface" hideSeparator>
      {condominiums.map((condominium, index) => (
        <Accordion.Item key={condominium.id} id={condominium.id}>
          <Accordion.Heading>
            <Accordion.Trigger className="flex w-full items-center gap-3 text-left">
              <span className="flex-1 truncate text-sm font-medium">{condominium.name}</span>
              <Accordion.Indicator />
            </Accordion.Trigger>
          </Accordion.Heading>

          <Accordion.Panel>
            <Accordion.Body className="flex flex-col gap-4 pb-2">
              <dl className="flex flex-col gap-2 text-sm">
                <Field label="#">{String(firstIndex + index + 1)}</Field>
                <Field label="Endereço">{condominium.address}</Field>
                <Field label="CNPJ">{formatCnpj(condominium.cnpj)}</Field>
                <Field label="Unidades">{String(condominium.unitsCount)}</Field>
                <Field label="Status">
                  <StatusChip deletedAt={condominium.deletedAt} />
                </Field>
              </dl>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onPress={() => onEdit(condominium)}>
                  Editar
                </Button>
                {condominium.deletedAt === null ? (
                  <Button
                    variant="danger"
                    className="flex-1"
                    onPress={() => onDeactivate(condominium)}
                  >
                    Desativar
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    className="flex-1"
                    onPress={() => onActivate(condominium)}
                  >
                    Ativar
                  </Button>
                )}
              </div>
            </Accordion.Body>
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  )
}
