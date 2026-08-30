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
}

export function UserRowMenu({ target, ...actions }: UserRowMenuProps): ReactElement | null {
  const menuTarget: RowMenuTarget<User> | null = target && {
    item: target.user,
    x: target.x,
    y: target.y,
  }

  return (
    <RowMenu
      target={menuTarget}
      label={(user) => user.name ?? user.email}
      isActive={(user) => user.deletedAt === null}
      {...actions}
    />
  )
}
