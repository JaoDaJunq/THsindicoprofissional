'use client'

import { useEffect, useState } from 'react'
export type SearchResource = 'users' | 'condominiums'

export interface SearchResult {
  id: string
  label: string
}

/** Enough to pick from without scrolling; the term narrows the rest. */
const LIMIT = 10
const TYPING_PAUSE = 300

/** Both listings answer with rows this shape: a condominium simply has no e-mail. */
interface Row {
  id: string
  name: string | null
  email?: string
}

const labelOf = (row: Row): string => row.name ?? row.email ?? ''

/**
 * Searches a listing endpoint by term instead of downloading every row. Waits
 * for the typing to stop, and drops the answer of a term already replaced.
 */
export function useSearch(resource: SearchResource, term: string): {
  results: readonly SearchResult[]
  isLoading: boolean
} {
  const query = term.trim()
  const request = `${resource}#${query}`
  const [loaded, setLoaded] = useState<{ request: string; results: SearchResult[] }>({
    request: '',
    results: [],
  })

  // Both are derived: what is on screen belongs to the previous term until the
  // current one answers, and an empty field has nothing to show or to wait for.
  const answered = loaded.request === request
  const results = query && answered ? loaded.results : []
  const isLoading = query !== '' && !answered

  useEffect(() => {
    if (!query) return

    const controller = new AbortController()

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/${resource}?search=${encodeURIComponent(query)}&pageSize=${LIMIT}`,
          { signal: controller.signal },
        )
        if (!response.ok) throw new Error('request-failed')

        const body = (await response.json()) as { items: Row[] }
        setLoaded({
          request,
          results: body.items.map((row) => ({ id: row.id, label: labelOf(row) })),
        })
      } catch {
        if (!controller.signal.aborted) setLoaded({ request, results: [] })
      }
    }, TYPING_PAUSE)

    return (): void => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [resource, query, request])

  return { results, isLoading }
}
