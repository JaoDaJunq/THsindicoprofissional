'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import type { ReactElement } from 'react'
import { useSession } from 'next-auth/react'

/** Entry point only: the (app) layout is what guards the signed-in screens. */
export default function HomePage(): ReactElement | null {
  const { status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/signin')
    if (status === 'authenticated') router.replace('/users')
  }, [status, router])

  return null
}
