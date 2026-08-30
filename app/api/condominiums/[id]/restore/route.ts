import { NextResponse } from 'next/server'
import { restoreCondominium } from '@/application/use-cases/restore-condominium'
import { getCondominiumRepository } from '@/infrastructure/repositories'
import { requireManager } from '../../../session'

type Context = { params: Promise<{ id: string }> }

export async function POST(_request: Request, context: Context): Promise<NextResponse> {
  if (!(await requireManager())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const { id } = await context.params
  const result = await restoreCondominium(getCondominiumRepository(), id)

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 404 })

  return new NextResponse(null, { status: 204 })
}
