'use client'

import { Button } from '@heroui/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { ReactElement } from 'react'
import { useSession } from 'next-auth/react'
import type { User } from '@/shared/types'

/**
 * While an administrator is seeing the system as someone else, a pill at the
 * top says whose name they are acting in, and offers the way out. It sits in
 * the flow, above the page rather than over it: covering the screen title to
 * save a few pixels would trade one problem for another.
 *
 * Its colours are the theme's, inverted — black on a light page, white on a
 * dark one — so it stands out in both without a `dark:` variant of its own.
 */
export function ImpersonationBanner({ account }: { account: User }): ReactElement | null {
  const { data: session, update } = useSession()
  const router = useRouter()
  const [isLeaving, setIsLeaving] = useState(false)

  if (!session?.user?.isImpersonated) return null

  async function stop(): Promise<void> {
    setIsLeaving(true)
    await update({ stopImpersonating: true })
    // whatever is on screen belongs to the other person
    router.refresh()
    setIsLeaving(false)
  }

  return (
    <div
      role="alert"
      className="bg-foreground text-background mx-auto flex w-full max-w-full items-center gap-3 rounded-b-xl py-1.5 pr-1.5 pl-4 text-sm shadow-md sm:w-fit sm:max-w-[calc(100vw-1.5rem)]"
    >
      <span className="min-w-0 truncate">
        Vendo como <strong>{account.name ?? account.email}</strong>
      </span>
      {/* the visible label shrinks on a phone; the accessible one never does */}
      <Button
        aria-label="Voltar a ser eu"
        variant="outline"
        className="bg-background text-foreground border-background min-h-11 shrink-0 sm:min-h-9"
        isPending={isLeaving}
        onPress={() => void stop()}
      >
        {/* one child: the button lays its children out with a gap, and the
            label would break into two pieces with a hole between them */}
        <span>
          Voltar<span className="max-sm:hidden"> a ser eu</span>
        </span>
      </Button>
    </div>
  )
}
