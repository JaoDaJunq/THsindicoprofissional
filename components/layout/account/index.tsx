'use client'

import { Avatar, Popover } from '@heroui/react'
import type { ReactElement } from 'react'
import { AccountCard, initialsOf } from './card'
import type { User } from '@/shared/types'

/** Avatar that opens the account card. */
export function AccountMenu({ account }: { account: User }): ReactElement {
  return (
    <Popover>
      <Popover.Trigger aria-label="Abrir a conta">
        <Avatar className="size-8">
          {account.image ? (
            <Avatar.Image src={account.image} alt="" />
          ) : (
            <Avatar.Fallback>{initialsOf(account)}</Avatar.Fallback>
          )}
        </Avatar>
      </Popover.Trigger>
      <Popover.Content>
        <Popover.Dialog className="min-w-64 p-5">
          <AccountCard account={account} />
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  )
}
