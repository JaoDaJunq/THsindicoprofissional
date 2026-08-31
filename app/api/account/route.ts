import { NextResponse } from 'next/server'
import { auth } from '@/infrastructure/auth/auth'
import { getUserRepository } from '@/infrastructure/repositories'

export async function GET(): Promise<NextResponse> {
  const session = await auth()
  const id = session?.user?.id
  if (!id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const user = await getUserRepository().findById(id)
  if (!user) return NextResponse.json({ error: 'user-not-found' }, { status: 404 })

  return NextResponse.json(user)
}
