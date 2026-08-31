'use client'

import { Surface } from '@heroui/react'
import type { ReactElement, ReactNode } from 'react'

/** A titled block on a form screen. Same shape in the panel and in the portal. */
export function Section({
  title,
  children,
}: {
  title: string
  children: ReactNode
}): ReactElement {
  return (
    <Surface className="border-default-200 flex flex-col gap-4 rounded-2xl border p-5">
      <h2 className="text-sm font-semibold">{title}</h2>
      {children}
    </Surface>
  )
}
