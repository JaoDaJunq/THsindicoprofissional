import { NextResponse } from 'next/server'
import { softDeleteUser } from '@/application/use-cases/soft-delete-user'
import { updateUser } from '@/application/use-cases/update-user'
import { auth } from '@/infrastructure/auth/auth'
import { getUserRepository } from '@/infrastructure/repositories'
import type { UpdateUserInput } from '@/shared/types'

type Context = { params: Promise<{ id: string }> }

async function requireSession(): Promise<boolean> {
  const session = await auth()
  return Boolean(session?.user)
}

export async function PATCH(request: Request, context: Context): Promise<NextResponse> {
  if (!(await requireSession())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { id } = await context.params
  const input = (await request.json()) as UpdateUserInput
  const result = await updateUser(getUserRepository(), id, input)

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.error === 'user-not-found' ? 404 : 400 })
  }

  return NextResponse.json(result.value)
}

export async function DELETE(_request: Request, context: Context): Promise<NextResponse> {
  if (!(await requireSession())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { id } = await context.params
  const result = await softDeleteUser(getUserRepository(), id)

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 404 })

  return new NextResponse(null, { status: 204 })
}
