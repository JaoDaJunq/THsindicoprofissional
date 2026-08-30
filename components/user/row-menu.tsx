'use client'

import { Dropdown } from '@heroui/react'
import type { Key } from 'react-aria-components'
import type { ReactElement } from 'react'
import type { User } from '@/shared/types'

export interface UserRowMenuProps {
  user: User
  onView: (user: User) => void
  onEdit: (user: User) => void
  onDelete: (user: User) => void
}

type Action = 'view' | 'edit' | 'delete'

/**
 * Row actions. React Aria's menu trigger already answers to click, touch and
 * long press, so phone and mouse share one code path.
 */
export function UserRowMenu({
  user,
  onView,
  onEdit,
  onDelete,
}: UserRowMenuProps): ReactElement {
  function run(key: Key): void {
    const action = String(key) as Action
    if (action === 'view') onView(user)
    if (action === 'edit') onEdit(user)
    if (action === 'delete') onDelete(user)
  }

  return (
    <Dropdown>
      <Dropdown.Trigger aria-label={`Ações de ${user.name ?? user.email}`}>
        <span aria-hidden="true">⋯</span>
      </Dropdown.Trigger>
      <Dropdown.Popover>
        <Dropdown.Menu onAction={run}>
          <Dropdown.Item id="view">Visualizar</Dropdown.Item>
          <Dropdown.Item id="edit">Editar</Dropdown.Item>
          <Dropdown.Item id="delete">Excluir</Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  )
}
