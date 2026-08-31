import { NextResponse } from 'next/server'
import { setCredentials } from '@/application/use-cases/set-credentials'
import type { SetCredentialsError } from '@/application/use-cases/set-credentials'
import { getUserRepository } from '@/infrastructure/repositories'
import { Argon2PasswordHasher } from '@/infrastructure/security/argon2-password-hasher'
import { requireManager } from '../../../session'
import type { SetCredentialsInput } from '@/shared/types'

type Context = { params: Promise<{ id: string }> }

const STATUS: Record<SetCredentialsError, number> = {
  'user-not-found': 404,
  'invalid-username': 400,
  'password-too-short': 400,
  'username-taken': 409,
}

export async function PUT(request: Request, context: Context): Promise<NextResponse> {
  if (!(await requireManager())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const { id } = await context.params
  const input = (await request.json()) as SetCredentialsInput
  const result = await setCredentials(
    getUserRepository(),
    new Argon2PasswordHasher(),
    id,
    input,
  )

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: STATUS[result.error] })
  }

  return new NextResponse(null, { status: 204 })
}
