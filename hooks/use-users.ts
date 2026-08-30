'use client'

import { useEffect, useState } from 'react'
import type { Page, User, UserFilters } from '@/shared/types'
import { DEFAULT_PAGE_SIZE } from '@/shared/types'

export interface UseUsersResult {
  page: Page<User> | null
  isLoading: boolean
  error: string | null
}

interface LoadedState {
  query: string
  page: Page<User> | null
  error: string | null
}

const NOTHING_LOADED: LoadedState = { query: '', page: null, error: null }

export function buildUsersQuery(filters: UserFilters, page: number): string {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(DEFAULT_PAGE_SIZE),
  })

  if (filters.search) params.set('search', filters.search)
  if (filters.isManager !== undefined) params.set('isManager', String(filters.isManager))
  if (filters.isActive !== undefined) params.set('isActive', String(filters.isActive))

  return `/api/users?${params.toString()}`
}

export function useUsers(
  filters: UserFilters,
  page: number,
  reloadToken = 0,
): UseUsersResult {
  const query = buildUsersQuery(filters, page)
  const request = `${query}#${reloadToken}`
  const [loaded, setLoaded] = useState<LoadedState>(NOTHING_LOADED)

  // Loading is derived, not stored: whatever is on screen belongs to the
  // previous query until the current one answers.
  const isLoading = loaded.query !== request

  useEffect(() => {
    const controller = new AbortController()

    async function load(): Promise<void> {
      try {
        const response = await fetch(query, { signal: controller.signal })
        if (!response.ok) throw new Error('request-failed')

        const body = (await response.json()) as Page<User>
        setLoaded({ query: request, page: body, error: null })
      } catch {
        if (controller.signal.aborted) return
        setLoaded({
          query: request,
          page: null,
          error: 'Não foi possível carregar os usuários.',
        })
      }
    }

    void load()

    return (): void => controller.abort()
  }, [query, request])

  return { page: loaded.page, isLoading, error: loaded.error }
}
