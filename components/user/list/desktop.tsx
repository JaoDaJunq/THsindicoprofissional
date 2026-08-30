'use client'

import { Table } from '@heroui/react'
import { useState } from 'react'
import type { MouseEvent, ReactElement } from 'react'
import { StatusChip } from '@/components/status-chip'
import { UserAvatar } from '@/components/user-avatar'
import { RoleChip } from '../role-chip'
import { UserRowMenu } from '../row-menu'
import type { UserMenuTarget } from '../row-menu'
import type { User } from '@/shared/types'
import type { UserListProps } from './mobile'

interface NumberedUser {
  id: string
  position: number
  user: User
}

export function UserListDesktop({
  users,
  firstIndex,
  onEdit,
  onDeactivate,
  onActivate,
}: UserListProps): ReactElement {
  const [target, setTarget] = useState<UserMenuTarget | null>(null)

  const rows: NumberedUser[] = users.map((user, index) => ({
    id: user.id,
    position: firstIndex + index + 1,
    user,
  }))

  function openMenu(event: MouseEvent, user: User): void {
    event.preventDefault()
    setTarget({ user, x: event.clientX, y: event.clientY })
  }

  return (
    <Table aria-label="Usuários">
      {/* the table is wider than a phone: it scrolls inside itself, never the page */}
      <Table.ScrollContainer>
        <Table.Content>
        <Table.Header>
          <Table.Column isRowHeader>#</Table.Column>
          <Table.Column>Foto</Table.Column>
          <Table.Column>Nome</Table.Column>
          <Table.Column>E-mail</Table.Column>
          <Table.Column>Papel</Table.Column>
          <Table.Column>Status</Table.Column>
        </Table.Header>
        <Table.Body>
          <Table.Collection items={rows}>
            {(row: NumberedUser) => (
              <Table.Row onContextMenu={(event) => openMenu(event, row.user)}>
                <Table.Cell>{row.position}</Table.Cell>
                <Table.Cell>
                  <UserAvatar user={row.user} />
                </Table.Cell>
                <Table.Cell>{row.user.name ?? '—'}</Table.Cell>
                <Table.Cell>{row.user.email}</Table.Cell>
                <Table.Cell>
                  <RoleChip role={row.user.role} />
                </Table.Cell>
                <Table.Cell>
                  <StatusChip deletedAt={row.user.deletedAt} />
                </Table.Cell>
              </Table.Row>
            )}
          </Table.Collection>
        </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>

      <UserRowMenu
        target={target}
        onClose={() => setTarget(null)}
        onEdit={onEdit}
        onDeactivate={onDeactivate}
        onActivate={onActivate}
      />
    </Table>
  )
}
