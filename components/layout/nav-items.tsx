import type { ReactElement } from 'react'
import type { UserRole } from '@/shared/types'

export interface NavItem {
  href: string
  label: string
  icon: ReactElement
  /** Who sees it. Absent means everyone. */
  roles?: readonly UserRole[]
}

// Inline icons: two drawings do not justify an icon library.
function UsersIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-5 shrink-0">
      <path
        d="M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 8v-1a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function BuildingIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-5 shrink-0">
      <path
        d="M3 21h18M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M15 21V9h2a2 2 0 0 1 2 2v10M8 7h2m-2 4h2m-2 4h2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function HomeIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-5 shrink-0">
      <path
        d="M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5M10 20v-6h4v6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * Every screen reachable from the admin navigation. "Início" is everyone's
 * own page — the same one a resident lands on — so it is here for every role.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/portal', label: 'Início', icon: <HomeIcon /> },
  { href: '/users', label: 'Usuários', icon: <UsersIcon />, roles: ['ADMIN', 'MANAGER'] },
  {
    href: '/condominiums',
    label: 'Condomínios',
    icon: <BuildingIcon />,
    roles: ['ADMIN', 'MANAGER'],
  },
]

/** The navigation shows only what the person may actually open. */
export function navItemsFor(role: UserRole): readonly NavItem[] {
  return NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role))
}
