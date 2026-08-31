import { NextResponse } from 'next/server'
import { restoreCondominium } from '@/application/use-cases/restore-condominium'
import { getCondominiumRepository } from '@/infrastructure/repositories'
import { requireManagerOf } from '../../../session'

type Context = { params: Promise<{ id: string }> }

export async function POST(_request: Request, context: Context): Promise<NextResponse> {
  const { id } = await context.params
  if (!(await requireManagerOf(id))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const result = await restoreCondominium(getCondominiumRepository(), id)

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 404 })

  return new NextResponse(null, { status: 204 })
}
