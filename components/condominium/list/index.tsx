'use client'

import type { ReactElement } from 'react'
import { CondominiumListDesktop } from './desktop'
import { CondominiumListMobile } from './mobile'
import type { CondominiumListProps } from './mobile'

/**
 * Both shapes render and CSS picks one. Choosing in JavaScript would leave the
 * list blank until hydration and risk a server/client mismatch.
 */
export function CondominiumList(props: CondominiumListProps): ReactElement {
  return (
    <div data-testid="condominium-list">
      <div className="hidden md:block">
        <CondominiumListDesktop {...props} />
      </div>
      <div className="md:hidden">
        <CondominiumListMobile {...props} />
      </div>
    </div>
  )
}

export type { CondominiumListProps }
