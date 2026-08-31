'use client'

import { Dropdown } from '@heroui/react'
import type { Key } from 'react-aria-components'
import type { ReactElement } from 'react'

/** Where the person right-clicked, and on what. */
export interface RowMenuTarget<T> {
  item: T
  x: number
  y: number
}

/** An action beyond the three every listing has. */
export interface RowMenuExtra<T> {
  id: string
  label: string
  path: string
  /** Per row, not per listing: a mixed list offers it on some rows only. */
  isVisible?: (item: T) => boolean
  onSelect: (item: T) => void
}

export interface RowMenuProps<T> {
  target: RowMenuTarget<T> | null
  /** Shown after the usual ones, when the caller has something else to offer. */
  extras?: readonly RowMenuExtra<T>[]
  /** Names the row for a screen reader. */
  label: (item: T) => string
  isActive: (item: T) => boolean
  onClose: () => void
  onEdit: (item: T) => void
  onDeactivate: (item: T) => void
  onActivate: (item: T) => void
}

type Action = 'edit' | 'deactivate' | 'activate'

function Icon({ d }: { d: string }): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-4 shrink-0">
      <path d={d} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const EDIT = { id: 'edit', label: 'Editar', path: 'M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z' } as const
const DEACTIVATE = {
  id: 'deactivate',
  label: 'Desativar',
  path: 'M4 7h16M9 7V5h6v2m-9 0 1 13h8l1-13',
} as const
const ACTIVATE = { id: 'activate', label: 'Ativar', path: 'M20 6 9 17l-5-5' } as const

/**
 * Row actions live in the context menu: the table shows data, the right button
 * (and the keyboard's menu key, which fires the same event) shows what to do with it.
 */
export function RowMenu<T>({
  target,
  extras = [],
  label,
  isActive,
  onClose,
  onEdit,
  onDeactivate,
  onActivate,
}: RowMenuProps<T>): ReactElement | null {
  if (!target) return null

  const { item } = target

  function run(key: Key): void {
    const action = String(key) as Action
    if (action === 'edit') onEdit(item)
    if (action === 'deactivate') onDeactivate(item)
    if (action === 'activate') onActivate(item)

    extras.find((extra) => extra.id === action)?.onSelect(item)
    onClose()
  }

  return (
    <Dropdown isOpen onOpenChange={(isOpen) => !isOpen && onClose()}>
      {/* anchors the popover at the cursor; the menu itself takes the focus */}
      <Dropdown.Trigger
        aria-label={`Ações de ${label(item)}`}
        className="fixed size-0 p-0 opacity-0"
        style={{ left: target.x, top: target.y }}
      />
      <Dropdown.Popover placement="bottom start">
        <Dropdown.Menu onAction={run}>
          {[
            EDIT,
            isActive(item) ? DEACTIVATE : ACTIVATE,
            ...extras.filter((extra) => extra.isVisible?.(item) ?? true),
          ].map((action) => (
            <Dropdown.Item key={action.id} id={action.id} className="flex items-center gap-2">
              <Icon d={action.path} />
              {action.label}
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  )
}
