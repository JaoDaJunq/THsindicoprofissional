'use client'

import { Button } from '@heroui/react'
import { useSyncExternalStore } from 'react'
import type { ReactElement } from 'react'

function SunIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-5">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function MoonIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-5">
      <path
        d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function isDarkNow(): boolean {
  return document.documentElement.classList.contains('dark')
}

function watchClass(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  return () => observer.disconnect()
}

/**
 * The mode is a class on `<html>`, which is what HeroUI reads. The inline
 * script in the root layout applies the saved choice before the first paint.
 */
export function ThemeToggle(): ReactElement {
  const isDark = useSyncExternalStore(watchClass, isDarkNow, () => false)

  function toggle(): void {
    const next = !isDark
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  return (
    <Button
      variant="ghost"
      isIconOnly
      aria-label={isDark ? 'Usar o modo claro' : 'Usar o modo escuro'}
      onPress={toggle}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </Button>
  )
}
