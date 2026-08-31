'use client'

import { useEffect, useState } from 'react'
import type { Condominium, CondominiumFilters, Page } from '@/shared/types'
import { DEFAULT_PAGE_SIZE } from '@/shared/types'

export interface UseCondominiumsResult {
  page: Page<Condominium> | null
  isLoading: boolean
  error: string | null
}

interface LoadedState {
  query: string
  page: Page<Condominium> | null
  error: string | null
}

const NOTHING_LOADED: LoadedState = { query: '', page: null, error: null }

export function buildCondominiumsQuery(filters: CondominiumFilters, page: number): string {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(DEFAULT_PAGE_SIZE),
  })

  if (filters.search) params.set('search', filters.search)
  if (filters.name) params.set('name', filters.name)
  if (filters.cnpj) params.set('cnpj', filters.cnpj)
  if (filters.status) params.set('status', filters.status)

  return `/api/condominiums?${params.toString()}`
}

export function useCondominiums(
  filters: CondominiumFilters,
  page: number,
  reloadToken = 0,
): UseCondominiumsResult {
  const query = buildCondominiumsQuery(filters, page)
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

        const body = (await response.json()) as Page<Condominium>
        setLoaded({ query: request, page: body, error: null })
      } catch {
        if (controller.signal.aborted) return
        setLoaded({
          query: request,
          page: null,
          error: 'Não foi possível carregar os condomínios.',
        })
      }
    }

    void load()

    return (): void => controller.abort()
  }, [query, request])

  return { page: loaded.page, isLoading, error: loaded.error }
}
