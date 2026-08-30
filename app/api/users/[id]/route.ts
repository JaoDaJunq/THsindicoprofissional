import { NextResponse } from 'next/server'
import { softDeleteUser } from '@/application/use-cases/soft-delete-user'
import type { SoftDeleteUserError } from '@/application/use-cases/soft-delete-user'
import { updateUser } from '@/application/use-cases/update-user'
import { auth } from '@/infrastructure/auth/auth'
import { getUserRepository } from '@/infrastructure/repositories'
import type { UpdateUserInput } from '@/shared/types'

type Context = { params: Promise<{ id: string }> }

/** Null when nobody is signed in; otherwise who is asking. */
async function requesterId(): Promise<string | null> {
  const session = await auth()
  return session?.user?.id ?? null
}

const DELETE_STATUS: Record<SoftDeleteUserError, number> = {
  'user-not-found': 404,
  'cannot-delete-self': 403,
}

export async function PATCH(request: Request, context: Context): Promise<NextResponse> {
  if (!(await requesterId())) {
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
  const requester = await requesterId()
  if (!requester) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await context.params
  const result = await softDeleteUser(getUserRepository(), id, requester)

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: DELETE_STATUS[result.error] })
  }

  return new NextResponse(null, { status: 204 })
}
