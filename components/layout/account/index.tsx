'use client'

import { Popover } from '@heroui/react'
import type { ReactElement } from 'react'
import { AccountCard } from './card'
import { UserAvatar } from '@/components/user-avatar'
import type { User } from '@/shared/types'

/** Avatar that opens the account card. */
export function AccountMenu({ account }: { account: User }): ReactElement {
  return (
    <Popover>
      <Popover.Trigger aria-label="Abrir a conta">
        <UserAvatar user={account} className="size-8" />
      </Popover.Trigger>
      <Popover.Content>
        <Popover.Dialog className="min-w-64 p-5">
          <AccountCard account={account} />
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  )
}
