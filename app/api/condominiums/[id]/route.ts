import { NextResponse } from 'next/server'
import { softDeleteCondominium } from '@/application/use-cases/soft-delete-condominium'
import { updateCondominium } from '@/application/use-cases/update-condominium'
import type { UpdateCondominiumError } from '@/application/use-cases/update-condominium'
import { getCondominiumRepository } from '@/infrastructure/repositories'
import { requireManagerOf } from '../../session'
import type { UpdateCondominiumInput } from '@/shared/types'

type Context = { params: Promise<{ id: string }> }

const forbidden = NextResponse.json({ error: 'forbidden' }, { status: 403 })

const UPDATE_STATUS: Record<UpdateCondominiumError, number> = {
  'condominium-not-found': 404,
  'invalid-name': 400,
  'invalid-address': 400,
  'invalid-cnpj': 400,
  'invalid-email': 400,
  'invalid-count': 400,
  'cnpj-already-registered': 409,
}

export async function PATCH(request: Request, context: Context): Promise<NextResponse> {
  const { id } = await context.params
  if (!(await requireManagerOf(id))) return forbidden

  const input = (await request.json()) as UpdateCondominiumInput
  const result = await updateCondominium(getCondominiumRepository(), id, input)

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: UPDATE_STATUS[result.error] })
  }

  return NextResponse.json(result.value)
}

export async function DELETE(_request: Request, context: Context): Promise<NextResponse> {
  const { id } = await context.params
  if (!(await requireManagerOf(id))) return forbidden

  const result = await softDeleteCondominium(getCondominiumRepository(), id)

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 404 })

  return new NextResponse(null, { status: 204 })
}
