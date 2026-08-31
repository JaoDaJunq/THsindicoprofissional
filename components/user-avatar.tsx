'use client'

import { Avatar } from '@heroui/react'
import type { ReactElement } from 'react'
import type { User } from '@/shared/types'

export function initialsOf(user: User): string {
  const source = user.name ?? user.email

  return source
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase()
}

/**
 * The fallback is always rendered: it is what shows while the photo loads and
 * what stays if it fails. Google only serves the avatar when the browser sends
 * no referrer, hence `referrerPolicy`.
 */
export function UserAvatar({
  user,
  className,
}: {
  user: User
  className?: string
}): ReactElement {
  return (
    <Avatar aria-label={`Foto de ${user.name ?? user.email}`} className={className}>
      {user.image && <Avatar.Image src={user.image} alt="" referrerPolicy="no-referrer" />}
      <Avatar.Fallback>{initialsOf(user)}</Avatar.Fallback>
    </Avatar>
  )
}
