'use client'

import { Input, Label, TextField } from '@heroui/react'
import type { ReactElement } from 'react'

/** Inside a Surface the field is secondary, or it disappears in dark mode. */
export function Field({
  label,
  value,
  onChange,
  type,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: 'password'
}): ReactElement {
  return (
    <TextField variant="secondary" value={value} onChange={onChange}>
      <Label>{label}</Label>
      <Input type={type} />
    </TextField>
  )
}
