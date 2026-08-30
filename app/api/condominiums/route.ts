import { NextResponse } from 'next/server'
import { createCondominium } from '@/application/use-cases/create-condominium'
import type { CreateCondominiumError } from '@/application/use-cases/create-condominium'
import { listCondominiums } from '@/application/use-cases/list-condominiums'
import { parseCondominiumQuery } from '@/infrastructure/http/condominium-query'
import { getCondominiumRepository } from '@/infrastructure/repositories'
import { requester, requireManager } from '../session'
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
  if (!(await requester())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { filters, page } = parseCondominiumQuery(new URL(request.url).searchParams)
  const result = await listCondominiums(getCondominiumRepository(), filters, page)

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })

  return NextResponse.json(result.value)
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!(await requireManager())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const input = (await request.json()) as CreateCondominiumInput
  const result = await createCondominium(getCondominiumRepository(), input)

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: CREATE_STATUS[result.error] })
  }

  return NextResponse.json(result.value, { status: 201 })
}
