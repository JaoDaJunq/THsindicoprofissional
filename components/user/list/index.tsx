'use client'

import type { ReactElement } from 'react'
import { UserListDesktop } from './desktop'
import { UserListMobile } from './mobile'
import type { UserListProps } from './mobile'

/**
 * Both shapes render and CSS picks one. Choosing in JavaScript would leave the
 * list blank until hydration and risk a server/client mismatch.
 */
export function UserList(props: UserListProps): ReactElement {
  return (
    <div data-testid="user-list">
      <div className="hidden md:block">
        <UserListDesktop {...props} />
      </div>
      <div className="md:hidden">
        <UserListMobile {...props} />
      </div>
    </div>
  )
}

export type { UserListProps }
