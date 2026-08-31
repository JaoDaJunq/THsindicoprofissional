import { NextResponse } from 'next/server'
import { listUsers } from '@/application/use-cases/list-users'
import { isAdmin } from '@/domain/authorization'
import { parseUserQuery } from '@/infrastructure/http/user-query'
import { getUserRepository } from '@/infrastructure/repositories'
import { managedCondominiumIds, requester } from '../session'

export async function GET(request: Request): Promise<NextResponse> {
  const user = await requester()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // The panel is not the resident's place; see the condominium listing.
  if (user.role === 'RESIDENT') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const scope = isAdmin(user)
    ? null
    : { inCondominiums: await managedCondominiumIds(user) }

  const { filters, page } = parseUserQuery(new URL(request.url).searchParams)
  const result = await listUsers(getUserRepository(), filters, page, scope)

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })

  return NextResponse.json(result.value)
}
