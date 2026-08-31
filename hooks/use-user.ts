'use client'

import { useEffect, useState } from 'react'
import type { User, UserId } from '@/shared/types'

export interface UseUserResult {
  user: User | null
  isLoading: boolean
  error: string | null
}

/** One person, by id. The screen edits a copy of what comes back. */
export function useUser(id: UserId): UseUserResult {
  const [state, setState] = useState<UseUserResult>({
    user: null,
    isLoading: true,
    error: null,
  })

  useEffect(() => {
    const controller = new AbortController()

    async function load(): Promise<void> {
      try {
        const response = await fetch(`/api/users/${id}`, { signal: controller.signal })
        if (!response.ok) throw new Error('request-failed')

        setState({ user: (await response.json()) as User, isLoading: false, error: null })
      } catch {
        if (controller.signal.aborted) return
        setState({
          user: null,
          isLoading: false,
          error: 'Não foi possível carregar essa pessoa.',
        })
      }
    }

    void load()

    return (): void => controller.abort()
  }, [id])

  return state
}
