import { NextResponse } from 'next/server'
import { softDeleteUser } from '@/application/use-cases/soft-delete-user'
import type { SoftDeleteUserError } from '@/application/use-cases/soft-delete-user'
import { updateUser } from '@/application/use-cases/update-user'
import type { UpdateUserError } from '@/application/use-cases/update-user'
import { getUserRepository } from '@/infrastructure/repositories'
import { requester, requireManager } from '../../session'
import type { UpdateUserInput } from '@/shared/types'

type Context = { params: Promise<{ id: string }> }

const forbidden = NextResponse.json({ error: 'forbidden' }, { status: 403 })

const UPDATE_STATUS: Record<UpdateUserError, number> = {
  'user-not-found': 404,
  'invalid-name': 400,
  'invalid-email': 400,
  'email-already-registered': 409,
}

const DELETE_STATUS: Record<SoftDeleteUserError, number> = {
  'user-not-found': 404,
  'cannot-delete-self': 403,
}

export async function GET(_request: Request, context: Context): Promise<NextResponse> {
  if (!(await requester())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { id } = await context.params
  const user = await getUserRepository().findById(id)

  if (!user) return NextResponse.json({ error: 'user-not-found' }, { status: 404 })

  return NextResponse.json(user)
}

export async function PATCH(request: Request, context: Context): Promise<NextResponse> {
  if (!(await requireManager())) return forbidden

  const { id } = await context.params
  const input = (await request.json()) as UpdateUserInput
  const result = await updateUser(getUserRepository(), id, input)

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: UPDATE_STATUS[result.error] })
  }

  return NextResponse.json(result.value)
}

export async function DELETE(_request: Request, context: Context): Promise<NextResponse> {
  const manager = await requireManager()
  if (!manager) return forbidden

  const { id } = await context.params
  const result = await softDeleteUser(getUserRepository(), id, manager.id)

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: DELETE_STATUS[result.error] })
  }

  return new NextResponse(null, { status: 204 })
}
