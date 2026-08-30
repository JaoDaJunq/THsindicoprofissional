'use client'

import type { ReactElement } from 'react'
import { NavDesktop } from './nav-desktop'
import { NavMobile } from './nav-mobile'
import type { User } from '@/shared/types'

/**
 * Both shapes render and CSS picks one, so the navigation is there before
 * hydration instead of appearing a frame later.
 */
export function AdminNav({ account }: { account: User }): ReactElement {
  return (
    <div data-testid="admin-nav" className="contents">
      <div className="hidden md:block">
        <NavDesktop account={account} />
      </div>
      <div className="md:hidden">
        <NavMobile account={account} />
      </div>
    </div>
  )
}
