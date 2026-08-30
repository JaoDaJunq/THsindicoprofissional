import { NextResponse } from 'next/server'
import { listUsers } from '@/application/use-cases/list-users'
import { auth } from '@/infrastructure/auth/auth'
import { parseUserQuery } from '@/infrastructure/http/user-query'
import { getUserRepository } from '@/infrastructure/repositories'

export async function GET(request: Request): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { filters, page } = parseUserQuery(new URL(request.url).searchParams)
  const result = await listUsers(getUserRepository(), filters, page)

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })

  return NextResponse.json(result.value)
}
