'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { AdminNav } from '@/components/layout/admin-nav'
import { useAccount } from '@/hooks/use-account'

/**
 * Every signed-in screen lives under this layout, so the guard and the
 * navigation exist in one place instead of in each page.
 */
export default function AppLayout({ children }: { children: ReactNode }): ReactElement | null {
  const { status } = useSession()
  const { account, isLoading, isGone } = useAccount(status === 'authenticated')
  const router = useRouter()

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

    if (account?.mustChangePassword) router.replace('/change-password')
  }, [status, account, isGone, router])

  if (isLoading || !account || account.mustChangePassword) return null

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <AdminNav account={account} />
      {/* room for the floating pill on phones */}
      <div className="flex-1 pb-28 md:pb-0">{children}</div>
    </div>
  )
}
