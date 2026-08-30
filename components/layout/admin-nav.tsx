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
      {/* Stays mounted so the width can animate; `inert` keeps the closed rail
          away from the mouse, the keyboard and screen readers.

          The stickiness belongs here, not on the rail inside: this element owns
          the `overflow-hidden` the animation needs, and an ancestor with
          overflow silently cancels `position: sticky` on its descendants.
          `self-start` earns its place too — a flex item stretched to the
          container's height has nowhere to slide. */}
      <div
        inert={!isRailOpen}
        className={[
          'sticky top-0 hidden h-screen self-start overflow-hidden',
          'transition-[width] duration-200 ease-out md:block',
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
