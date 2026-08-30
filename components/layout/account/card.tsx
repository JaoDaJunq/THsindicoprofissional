'use client'

import { Button } from '@heroui/react'
import { signOut } from 'next-auth/react'
import { useState } from 'react'
import type { ReactElement } from 'react'
import { UserAvatar } from '@/components/user-avatar'
import { ROLE_LABEL } from '@/components/user/role-chip'
import type { User } from '@/shared/types'

/** Shared by the sidebar and the phone pill, so both show the same account. */
export function AccountCard({ account }: { account: User }): ReactElement {
  const [isSigningOut, setIsSigningOut] = useState(false)

  function endSession(): void {
    setIsSigningOut(true)
    void signOut({ callbackUrl: '/signin' })
  }

  return (
    <div data-testid="account-card" className="flex flex-col items-center gap-3 py-2">
      <UserAvatar user={account} className="size-16" />

      <div className="flex flex-col items-center gap-0.5 text-center">
        <p className="font-semibold">{account.name ?? account.email}</p>
        <p className="text-default-500 text-sm">{account.email}</p>
        <p className="text-default-500 text-xs">{ROLE_LABEL[account.role]}</p>
      </div>

      <Button variant="danger" isPending={isSigningOut} onPress={endSession}>
        Sair
      </Button>
    </div>
  )
}
