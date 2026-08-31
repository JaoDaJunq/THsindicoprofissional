'use client'

import type { ReactElement } from 'react'
import { RowMenu } from '@/components/row-menu'
import type { RowMenuTarget } from '@/components/row-menu'
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
  onEdit: (user: User) => void
  onDeactivate: (user: User) => void
  onActivate: (user: User) => void
  /** Absent when whoever is looking cannot impersonate anyone. */
  onImpersonate?: (user: User) => void
  /** Which rows accept it. Absent means all of them. */
  canImpersonate?: (user: User) => boolean
}

const EYE = 'M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Zm10 2.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z'

export function UserRowMenu({
  target,
  canImpersonate,
  onImpersonate,
  ...actions
}: UserRowMenuProps): ReactElement | null {
  const menuTarget: RowMenuTarget<User> | null = target && {
    item: target.user,
    x: target.x,
    y: target.y,
  }

  const extras = onImpersonate
    ? [
        {
          id: 'impersonate',
          label: 'Ver como esta pessoa',
          path: EYE,
          isVisible: canImpersonate,
          onSelect: onImpersonate,
        },
      ]
    : []

  return (
    <RowMenu
      target={menuTarget}
      extras={extras}
      label={(user) => user.name ?? user.email}
      isActive={(user) => user.deletedAt === null}
      {...actions}
    />
  )
}
