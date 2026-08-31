'use client'

import { Button } from '@heroui/react'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { AdminNav } from '@/components/layout/admin-nav'
import { ImpersonationBanner } from '@/components/layout/impersonation-banner'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { useAccount } from '@/hooks/use-account'
import type { User } from '@/shared/types'

function PanelIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-5">
      <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M9 4v16" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  )
}

/**
 * Only someone who signs in with a username has a password to replace. Whoever
 * came through Google never received one, whatever the flag in the row says.
 */
function mustChangePassword(account: User | null): boolean {
  return Boolean(account?.mustChangePassword && account.username)
}

/**
 * Every signed-in screen lives under this layout, so the guard and the
 * navigation exist in one place instead of in each page.
 */
export default function AppLayout({ children }: { children: ReactNode }): ReactElement | null {
  const [isRailOpen, setIsRailOpen] = useState(true)
  const { status } = useSession()
  const { account, isLoading, isGone } = useAccount(status === 'authenticated')
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/signin')
      return
    }

    // A valid session whose person is gone (removed, or a stale token) would
    // otherwise sit on a blank screen forever.
    if (isGone) {
      void signOut({ callbackUrl: '/signin' })
      return
    }

    if (mustChangePassword(account)) {
      router.replace('/change-password')
      return
    }

    // Same shell for everyone; a resident just has fewer screens in it, and
    // gets sent home if a link or an old URL lands them on one of the others.
    if (account?.role === 'RESIDENT' && !pathname.startsWith('/portal')) {
      router.replace('/portal')
    }
  }, [status, account, isGone, pathname, router])

  if (isLoading || !account || mustChangePassword(account)) return null

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <AdminNav account={account} isRailOpen={isRailOpen} />
      {/* room for the floating pill on phones */}
      <div className="flex-1 pb-28 md:pb-0">
        {/* inside the content column, so the rail still reaches the top edge */}
        <ImpersonationBanner account={account} />

        {/* the rail is a desktop shape; on phones the pill already does this */}
        <div className="hidden items-center gap-1 px-3 pt-3 md:flex">
          <Button
            variant="ghost"
            isIconOnly
            aria-label={isRailOpen ? 'Fechar o menu lateral' : 'Abrir o menu lateral'}
            onPress={() => setIsRailOpen((isOpen) => !isOpen)}
          >
            <PanelIcon />
          </Button>
          <ThemeToggle />
        </div>
        {children}
      </div>
    </div>
  )
}
