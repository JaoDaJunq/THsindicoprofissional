'use client'

import { Table } from '@heroui/react'
import { useState } from 'react'
import type { MouseEvent, ReactElement } from 'react'
import { RowMenu } from '@/components/row-menu'
import type { RowMenuTarget } from '@/components/row-menu'
import { StatusChip } from '@/components/status-chip'
import { formatCnpj } from '../format'
import type { Condominium } from '@/shared/types'
import type { CondominiumListProps } from './mobile'

interface NumberedCondominium {
  id: string
  position: number
  condominium: Condominium
}

export function CondominiumListDesktop({
  condominiums,
  firstIndex,
  onEdit,
  onDeactivate,
  onActivate,
}: CondominiumListProps): ReactElement {
  const [target, setTarget] = useState<RowMenuTarget<Condominium> | null>(null)

  const rows: NumberedCondominium[] = condominiums.map((condominium, index) => ({
    id: condominium.id,
    position: firstIndex + index + 1,
    condominium,
  }))

  function openMenu(event: MouseEvent, condominium: Condominium): void {
    event.preventDefault()
    setTarget({ item: condominium, x: event.clientX, y: event.clientY })
  }

  return (
    <Table aria-label="Condomínios">
      {/* the table is wider than a phone: it scrolls inside itself, never the page */}
      <Table.ScrollContainer>
        <Table.Content>
          <Table.Header>
            <Table.Column isRowHeader>#</Table.Column>
            <Table.Column>Nome</Table.Column>
            <Table.Column>Endereço</Table.Column>
            <Table.Column>CNPJ</Table.Column>
            <Table.Column>Unidades</Table.Column>
            <Table.Column>Status</Table.Column>
          </Table.Header>
          <Table.Body>
            <Table.Collection items={rows}>
              {(row: NumberedCondominium) => (
                <Table.Row onContextMenu={(event) => openMenu(event, row.condominium)}>
                  <Table.Cell>{row.position}</Table.Cell>
                  <Table.Cell>{row.condominium.name}</Table.Cell>
                  <Table.Cell>{row.condominium.address}</Table.Cell>
                  <Table.Cell>{formatCnpj(row.condominium.cnpj)}</Table.Cell>
                  <Table.Cell>{row.condominium.unitsCount}</Table.Cell>
                  <Table.Cell>
                    <StatusChip deletedAt={row.condominium.deletedAt} />
                  </Table.Cell>
                </Table.Row>
              )}
            </Table.Collection>
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>

      <RowMenu
        target={target}
        label={(condominium) => condominium.name}
        isActive={(condominium) => condominium.deletedAt === null}
        onClose={() => setTarget(null)}
        onEdit={onEdit}
        onDeactivate={onDeactivate}
        onActivate={onActivate}
      />
    </Table>
  )
}
