'use client'

import { Button, Surface } from '@heroui/react'
import { signOut } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { ROLE_LABEL } from '@/components/user/role-chip'
import type { ReactElement } from 'react'
import { NAV_ITEMS } from './nav-items'
import { UserAvatar } from '@/components/user-avatar'
import type { User } from '@/shared/types'

/** Left rail: who is signed in on top, the screens below, the way out at the bottom. */
export function NavDesktop({ account }: { account: User }): ReactElement {
  const pathname = usePathname()
  const [isSigningOut, setIsSigningOut] = useState(false)

  return (
    <Surface
      data-testid="nav-desktop"
      className="border-default-200 flex h-screen w-60 shrink-0 flex-col gap-2 border-r p-3"
    >
      <div className="flex items-center gap-3 px-2 py-3">
        <UserAvatar user={account} className="size-10 shrink-0" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{account.name ?? account.email}</p>
          <p className="text-default-500 truncate text-xs">
            {ROLE_LABEL[account.role]}
          </p>
        </div>
      </div>

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

      <Button
        variant="danger"
        className="w-full"
        isPending={isSigningOut}
        onPress={() => {
          setIsSigningOut(true)
          void signOut({ callbackUrl: '/signin' })
        }}
      >
        Sair
      </Button>
    </Surface>
  )
}
