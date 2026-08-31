'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import type { User } from '@/shared/types'

export interface UseAccountResult {
  account: User | null
  isLoading: boolean
  /** The session is valid but the person no longer exists (or was removed). */
  isGone: boolean
}

/**
 * The signed-in person, as the server sees them. It follows the session's
 * identity, not just whether there is one: impersonating someone — and coming
 * back — changes who the token stands for, and every screen reading this hook
 * would otherwise keep showing the person before the switch.
 */
export function useAccount(enabled: boolean): UseAccountResult {
  const { data: session } = useSession()
  const identity = session?.user?.id
  const [account, setAccount] = useState<User | null>(null)
  const [hasAnswered, setHasAnswered] = useState(false)
  const [isGone, setIsGone] = useState(false)

  useEffect(() => {
    if (!enabled) return

    const controller = new AbortController()

    async function load(): Promise<void> {
      try {
        const response = await fetch('/api/account', { signal: controller.signal })
        setIsGone(response.status === 404 || response.status === 401)
        setAccount(response.ok ? ((await response.json()) as User) : null)
      } catch {
        if (!controller.signal.aborted) setAccount(null)
      } finally {
        if (!controller.signal.aborted) setHasAnswered(true)
      }
    }

    void load()

    return (): void => controller.abort()
  }, [enabled, identity])

  return { account, isLoading: enabled && !hasAnswered, isGone }
}
