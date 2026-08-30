'use client'

import { Button, Drawer, Surface } from '@heroui/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import type { ReactElement } from 'react'
import { AccountMenu } from './account'
import { NAV_ITEMS } from './nav-items'
import type { User } from '@/shared/types'

function MenuIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-5">
      <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

/** Floating pill: account on one side, menu on the other. Links live in a drawer. */
export function NavMobile({ account }: { account: User }): ReactElement {
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <>
      <nav
        aria-label="Menu administrativo"
        data-testid="nav-mobile"
        className="fixed inset-x-4 bottom-6 z-50"
      >
        <Surface className="border-default-200 flex items-center justify-between rounded-full border px-3 py-2 shadow-lg">
          <AccountMenu account={account} />

          <span className="text-sm font-medium">Gestão Condominial</span>

          <Button
            variant="ghost"
            isIconOnly
            aria-label="Abrir o menu"
            onPress={() => setIsMenuOpen(true)}
          >
            <MenuIcon />
          </Button>
        </Surface>
      </nav>

      <Drawer isOpen={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <Drawer.Backdrop>
          <Drawer.Content placement="bottom">
            <Drawer.Dialog>
              <Drawer.Header>
                <Drawer.Heading>Menu</Drawer.Heading>
              </Drawer.Header>
              <Drawer.Body>
                <div className="flex flex-col gap-2 pb-4">
                  {NAV_ITEMS.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={pathname === item.href ? 'page' : undefined}
                      onClick={() => setIsMenuOpen(false)}
                      className={[
                        'flex items-center gap-2 rounded-lg px-3 py-2 text-sm',
                        pathname === item.href ? 'bg-default-200 font-medium' : 'hover:bg-default-100',
                      ].join(' ')}
                    >
                      {item.icon}
                      {item.label}
                    </Link>
                  ))}
                </div>
              </Drawer.Body>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>
    </>
  )
}
