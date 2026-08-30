'use client'

import { Surface } from '@heroui/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactElement } from 'react'
import { AccountCard } from './account/card'
import { NAV_ITEMS } from './nav-items'
import type { User } from '@/shared/types'

/** Left rail. The account card sits at the bottom, always visible. */
export function NavDesktop({ account }: { account: User }): ReactElement {
  const pathname = usePathname()

  return (
    <Surface
      data-testid="nav-desktop"
      className="border-default-200 flex h-screen w-60 shrink-0 flex-col gap-2 border-r p-3"
    >
      <p className="px-3 py-2 text-sm font-semibold">Gestão Condominial</p>

      <nav aria-label="Menu administrativo" className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={pathname === item.href ? 'page' : undefined}
            className={[
              'flex items-center gap-2 rounded-lg px-3 py-2 text-sm',
              pathname === item.href ? 'bg-default-200 font-medium' : 'hover:bg-default-100',
            ].join(' ')}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="border-default-200 border-t pt-3">
        <AccountCard account={account} />
      </div>
    </Surface>
  )
}
