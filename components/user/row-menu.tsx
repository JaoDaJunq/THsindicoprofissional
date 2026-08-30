'use client'

import { Dropdown } from '@heroui/react'
import type { Key } from 'react-aria-components'
import type { ReactElement } from 'react'
import type { User } from '@/shared/types'

/** Where the person right-clicked, and on whom. */
export interface UserMenuTarget {
  user: User
  x: number
  y: number
}

export interface UserRowMenuProps {
  target: UserMenuTarget | null
  onClose: () => void
  onView: (user: User) => void
  onEdit: (user: User) => void
  onDelete: (user: User) => void
}

type Action = 'view' | 'edit' | 'delete'

function Icon({ d }: { d: string }): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-4 shrink-0">
      <path d={d} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const ITEMS: { id: Action; label: string; path: string }[] = [
  { id: 'view', label: 'Visualizar', path: 'M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Zm10 2.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z' },
  { id: 'edit', label: 'Editar', path: 'M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z' },
  { id: 'delete', label: 'Excluir', path: 'M4 7h16M9 7V5h6v2m-9 0 1 13h8l1-13' },
]

/**
 * Row actions live in the context menu: the table shows data, the right button
 * (and the keyboard's menu key, which fires the same event) shows what to do with it.
 */
export function UserRowMenu({
  target,
  onClose,
  onView,
  onEdit,
  onDelete,
}: UserRowMenuProps): ReactElement | null {
  if (!target) return null

  const { user } = target

  function run(key: Key): void {
    const action = String(key) as Action
    if (action === 'view') onView(user)
    if (action === 'edit') onEdit(user)
    if (action === 'delete') onDelete(user)
    onClose()
  }

  return (
    <Dropdown isOpen onOpenChange={(isOpen) => !isOpen && onClose()}>
      {/* anchors the popover at the cursor; the menu itself takes the focus */}
      <Dropdown.Trigger
        aria-label={`Ações de ${user.name ?? user.email}`}
        className="fixed size-0 p-0 opacity-0"
        style={{ left: target.x, top: target.y }}
      />
      <Dropdown.Popover placement="bottom start">
        <Dropdown.Menu onAction={run}>
          {ITEMS.map((item) => (
            <Dropdown.Item key={item.id} id={item.id} className="flex items-center gap-2">
              <Icon d={item.path} />
              {item.label}
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  )
}
