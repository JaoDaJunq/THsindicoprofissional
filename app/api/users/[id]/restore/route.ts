import { NextResponse } from 'next/server'
import { restoreUser } from '@/application/use-cases/restore-user'
import { auth } from '@/infrastructure/auth/auth'
import { getUserRepository } from '@/infrastructure/repositories'

type Context = { params: Promise<{ id: string }> }

export async function POST(_request: Request, context: Context): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await context.params
  const result = await restoreUser(getUserRepository(), id)

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 404 })

  return new NextResponse(null, { status: 204 })
}
