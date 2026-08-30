'use client'

import { Accordion, Button } from '@heroui/react'
import type { ReactElement } from 'react'
import { StatusChip } from '@/components/status-chip'
import { UserAvatar } from '@/components/user-avatar'
import type { User } from '@/shared/types'

export interface UserListProps {
  users: readonly User[]
  firstIndex: number
  onEdit: (user: User) => void
  onDeactivate: (user: User) => void
  onActivate: (user: User) => void
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

/** On a phone a row of columns does not fit; each person becomes a panel. */
export function UserListMobile({
  users,
  firstIndex,
  onEdit,
  onDeactivate,
  onActivate,
}: UserListProps): ReactElement {
  if (users.length === 0) {
    return <p className="text-default-500 py-8 text-center text-sm">Nenhum usuário encontrado.</p>
  }

  return (
    <Accordion variant="surface" hideSeparator>
      {users.map((user, index) => (
        <Accordion.Item key={user.id} id={user.id}>
          <Accordion.Heading>
            <Accordion.Trigger className="flex w-full items-center gap-3 text-left">
              <UserAvatar user={user} className="size-8 shrink-0" />
              <span className="flex-1 truncate text-sm font-medium">
                {user.name ?? user.email}
              </span>
              <Accordion.Indicator />
            </Accordion.Trigger>
          </Accordion.Heading>

          <Accordion.Panel>
            <Accordion.Body className="flex flex-col gap-4 pb-2">
              <dl className="flex flex-col gap-2 text-sm">
                <Field label="#">{String(firstIndex + index + 1)}</Field>
                <Field label="E-mail">{user.email}</Field>
                <Field label="Perfil">{user.isManager ? 'Síndico' : 'Morador'}</Field>
                <Field label="Status">
                  <StatusChip deletedAt={user.deletedAt} />
                </Field>
              </dl>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onPress={() => onEdit(user)}>
                  Editar
                </Button>
                {user.deletedAt === null ? (
                  <Button variant="danger" className="flex-1" onPress={() => onDeactivate(user)}>
                    Desativar
                  </Button>
                ) : (
                  <Button variant="primary" className="flex-1" onPress={() => onActivate(user)}>
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
