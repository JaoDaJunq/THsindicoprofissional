'use client'

import { Avatar, Button } from '@heroui/react'
import { signOut } from 'next-auth/react'
import { useState } from 'react'
import type { ReactElement } from 'react'
import type { User } from '@/shared/types'

export function initialsOf(account: User): string {
  const source = account.name ?? account.email

  return source
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase()
}

/** Shared by the sidebar and the phone pill, so both show the same account. */
export function AccountCard({ account }: { account: User }): ReactElement {
  const [isSigningOut, setIsSigningOut] = useState(false)

  function endSession(): void {
    setIsSigningOut(true)
    void signOut({ callbackUrl: '/signin' })
  }

  return (
    <div data-testid="account-card" className="flex flex-col items-center gap-3 py-2">
      <Avatar aria-label={`Foto de ${account.name ?? account.email}`} className="size-16">
        {account.image ? (
          <Avatar.Image src={account.image} alt="" />
        ) : (
          <Avatar.Fallback>{initialsOf(account)}</Avatar.Fallback>
        )}
      </Avatar>

      <div className="flex flex-col items-center gap-0.5 text-center">
        <p className="font-semibold">{account.name ?? account.email}</p>
        <p className="text-default-500 text-sm">{account.email}</p>
        {account.isManager && <p className="text-default-500 text-xs">Síndico</p>}
      </div>

      <Button variant="danger" isPending={isSigningOut} onPress={endSession}>
        Sair
      </Button>
    </div>
  )
}
