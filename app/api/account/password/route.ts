import { NextResponse } from 'next/server'
import { changePassword } from '@/application/use-cases/change-password'
import { auth } from '@/infrastructure/auth/auth'
import { getUserRepository } from '@/infrastructure/repositories'
import { Argon2PasswordHasher } from '@/infrastructure/security/argon2-password-hasher'

const STATUS: Record<string, number> = {
  'user-not-found': 404,
  'invalid-credentials': 400,
  'password-too-short': 400,
  'password-unchanged': 400,
}

export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth()
  const id = session?.user?.id
  if (!id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = (await request.json()) as {
    currentPassword?: string
    newPassword?: string
  }

  const result = await changePassword(getUserRepository(), new Argon2PasswordHasher(), id, {
    currentPassword: String(body.currentPassword ?? ''),
    newPassword: String(body.newPassword ?? ''),
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: STATUS[result.error] ?? 400 })
  }

  return new NextResponse(null, { status: 204 })
}
