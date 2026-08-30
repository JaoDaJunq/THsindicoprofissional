'use client'

import { useEffect, useState } from 'react'

/** Tailwind's `md` breakpoint, so CSS and behaviour agree on what "mobile" is. */
export const MOBILE_QUERY = '(max-width: 767px)'

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const query = window.matchMedia(MOBILE_QUERY)
    const sync = (): void => setIsMobile(query.matches)

    sync()
    query.addEventListener('change', sync)
    return (): void => query.removeEventListener('change', sync)
  }, [])

  return isMobile
}
