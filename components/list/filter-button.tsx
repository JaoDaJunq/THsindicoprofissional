'use client'

import { Button, Tooltip } from '@heroui/react'
import type { ReactElement } from 'react'

function FilterIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-4">
      <path d="M3 5h18M6 12h12M10 19h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

/** Opens the filters of whichever listing is on screen. */
export function FilterButton({ onPress }: { onPress: () => void }): ReactElement {
  return (
    <Tooltip>
      <Tooltip.Trigger>
        <Button aria-label="Filtros" isIconOnly variant="primary" onPress={onPress}>
          <FilterIcon />
        </Button>
      </Tooltip.Trigger>
      <Tooltip.Content>Filtros</Tooltip.Content>
    </Tooltip>
  )
}
