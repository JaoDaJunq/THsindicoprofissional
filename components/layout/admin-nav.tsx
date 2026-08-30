'use client'

import type { ReactElement } from 'react'
import { NavDesktop } from './nav-desktop'
import { NavMobile } from './nav-mobile'
import type { User } from '@/shared/types'

/**
 * Both shapes render and CSS picks one, so the navigation is there before
 * hydration instead of appearing a frame later.
 */
export function AdminNav({
  account,
  isRailOpen = true,
}: {
  account: User
  isRailOpen?: boolean
}): ReactElement {
  return (
    <div data-testid="admin-nav" className="contents">
      {/* stays mounted so the width can animate; `inert` keeps the closed rail
          away from the mouse, the keyboard and screen readers */}
      <div
        inert={!isRailOpen}
        className={[
          'hidden overflow-hidden transition-[width] duration-200 ease-out md:block',
          isRailOpen ? 'w-60' : 'w-0',
        ].join(' ')}
      >
        <NavDesktop account={account} />
      </div>
      <div className="md:hidden">
        <NavMobile account={account} />
      </div>
    </div>
  )
}
