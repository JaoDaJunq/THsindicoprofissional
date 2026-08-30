'use client'

import { Accordion, Avatar, Button, Chip } from '@heroui/react'
import type { ReactElement } from 'react'
import type { User } from '@/shared/types'

export interface UserListProps {
  users: readonly User[]
  firstIndex: number
  onView: (user: User) => void
  onEdit: (user: User) => void
  onDelete: (user: User) => void
}

function initials(user: User): string {
  return (user.name ?? user.email).slice(0, 2).toUpperCase()
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
  onView,
  onEdit,
  onDelete,
}: UserListProps): ReactElement {
  if (users.length === 0) {
    return <p className="text-default-500 py-8 text-center text-sm">Nenhum usuário encontrado.</p>
  }

  return (
    <Accordion>
      {users.map((user, index) => (
        <Accordion.Item key={user.id} id={user.id}>
          <Accordion.Heading>
            <Accordion.Trigger className="flex w-full items-center gap-3 text-left">
              <Avatar
                aria-label={`Foto de ${user.name ?? user.email}`}
                className="size-8 shrink-0"
              >
                {user.image ? (
                  <Avatar.Image src={user.image} alt="" />
                ) : (
                  <Avatar.Fallback>{initials(user)}</Avatar.Fallback>
                )}
              </Avatar>
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
                  <Chip variant={user.isActive ? 'primary' : 'soft'}>
                    {user.isActive ? 'Ativo' : 'Inativo'}
                  </Chip>
                </Field>
              </dl>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onPress={() => onView(user)}>
                  Visualizar
                </Button>
                <Button variant="outline" className="flex-1" onPress={() => onEdit(user)}>
                  Editar
                </Button>
                <Button variant="danger" className="flex-1" onPress={() => onDelete(user)}>
                  Excluir
                </Button>
              </div>
            </Accordion.Body>
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  )
}
