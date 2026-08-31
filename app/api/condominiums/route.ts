import { NextResponse } from 'next/server'
import { createCondominium } from '@/application/use-cases/create-condominium'
import type { CreateCondominiumError } from '@/application/use-cases/create-condominium'
import { listCondominiums } from '@/application/use-cases/list-condominiums'
import { parseCondominiumQuery } from '@/infrastructure/http/condominium-query'
import { getCondominiumRepository } from '@/infrastructure/repositories'
import { requireAdmin, requester, scopeOf } from '../session'
import type { CreateCondominiumInput } from '@/shared/types'

const CREATE_STATUS: Record<CreateCondominiumError, number> = {
  'invalid-name': 400,
  'invalid-address': 400,
  'invalid-cnpj': 400,
  'invalid-email': 400,
  'invalid-count': 400,
  'cnpj-already-registered': 409,
}

export async function GET(request: Request): Promise<NextResponse> {
  const user = await requester()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // A resident has no business in the admin panel: an empty list would say
  // they are in the right place and there is nothing here, which is a lie.
  if (user.role === 'RESIDENT') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const { filters, page } = parseCondominiumQuery(new URL(request.url).searchParams)
  const result = await listCondominiums(
    getCondominiumRepository(),
    filters,
    page,
    scopeOf(user),
  )

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })

  return NextResponse.json(result.value)
}

export async function POST(request: Request): Promise<NextResponse> {
  // Only the administrator opens a new condominium.
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const input = (await request.json()) as CreateCondominiumInput
  const result = await createCondominium(getCondominiumRepository(), input)

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: CREATE_STATUS[result.error] })
  }

  return NextResponse.json(result.value, { status: 201 })
}
