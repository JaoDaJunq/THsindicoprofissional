'use client'

import { Avatar, Chip, Table } from '@heroui/react'
import type { ReactElement } from 'react'
import { UserRowMenu } from '../row-menu'
import type { User } from '@/shared/types'
import type { UserListProps } from './mobile'

interface NumberedUser {
  id: string
  position: number
  user: User
}

function initials(user: User): string {
  return (user.name ?? user.email).slice(0, 2).toUpperCase()
}

export function UserListDesktop({
  users,
  firstIndex,
  onView,
  onEdit,
  onDelete,
}: UserListProps): ReactElement {
  const rows: NumberedUser[] = users.map((user, index) => ({
    id: user.id,
    position: firstIndex + index + 1,
    user,
  }))

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
          <Table.Column>Síndico</Table.Column>
          <Table.Column>Status</Table.Column>
          <Table.Column>Ações</Table.Column>
        </Table.Header>
        <Table.Body>
          <Table.Collection items={rows}>
            {(row: NumberedUser) => (
              <Table.Row>
                <Table.Cell>{row.position}</Table.Cell>
                <Table.Cell>
                  <Avatar aria-label={`Foto de ${row.user.name ?? row.user.email}`}>
                    {row.user.image ? (
                      <Avatar.Image src={row.user.image} alt="" />
                    ) : (
                      <Avatar.Fallback>{initials(row.user)}</Avatar.Fallback>
                    )}
                  </Avatar>
                </Table.Cell>
                <Table.Cell>{row.user.name ?? '—'}</Table.Cell>
                <Table.Cell>{row.user.email}</Table.Cell>
                <Table.Cell>{row.user.isManager ? 'Sim' : 'Não'}</Table.Cell>
                <Table.Cell>
                  <Chip variant={row.user.isActive ? 'primary' : 'soft'}>
                    {row.user.isActive ? 'Ativo' : 'Inativo'}
                  </Chip>
                </Table.Cell>
                <Table.Cell>
                  <UserRowMenu
                    user={row.user}
                    onView={onView}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                </Table.Cell>
              </Table.Row>
            )}
          </Table.Collection>
        </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  )
}
