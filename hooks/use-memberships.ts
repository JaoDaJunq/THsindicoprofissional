'use client'

import { useEffect, useState } from 'react'
import type { Membership, MembershipFilters } from '@/shared/types'

export interface UseMembershipsResult {
  memberships: readonly Membership[]
  isLoading: boolean
  error: string | null
}

export function buildMembershipsQuery(filters: MembershipFilters): string {
  const params = new URLSearchParams(filters)
  return `/api/memberships?${params.toString()}`
}

/** The links of one side — a condominium's people, or a person's condominiums. */
export function useMemberships(
  filters: MembershipFilters,
  reloadToken = 0,
): UseMembershipsResult {
  const query = buildMembershipsQuery(filters)
  const [state, setState] = useState<UseMembershipsResult>({
    memberships: [],
    isLoading: true,
    error: null,
  })

  useEffect(() => {
    const controller = new AbortController()

    async function load(): Promise<void> {
      try {
        const response = await fetch(query, { signal: controller.signal })
        if (!response.ok) throw new Error('request-failed')

        setState({
          memberships: (await response.json()) as Membership[],
          isLoading: false,
          error: null,
        })
      } catch {
        if (controller.signal.aborted) return
        setState({
          memberships: [],
          isLoading: false,
          error: 'Não foi possível carregar os vínculos.',
        })
      }
    }

    void load()

    return (): void => controller.abort()
  }, [query, reloadToken])

  return state
}
