import { NextResponse } from 'next/server'
import { addMember } from '@/application/use-cases/add-member'
import type { AddMemberError } from '@/application/use-cases/add-member'
import { changeMemberRole } from '@/application/use-cases/change-member-role'
import { removeMember } from '@/application/use-cases/remove-member'
import {
  getCondominiumRepository,
  getMembershipRepository,
  getUserRepository,
} from '@/infrastructure/repositories'
import { requester, requireManager } from '../session'
import type { MembershipFilters, MembershipInput } from '@/shared/types'

const ADD_STATUS: Record<AddMemberError, number> = {
  'user-not-found': 404,
  'condominium-not-found': 404,
  'already-a-member': 409,
}

function ports(): Parameters<typeof addMember>[0] {
  return {
    memberships: getMembershipRepository(),
    users: getUserRepository(),
    condominiums: getCondominiumRepository(),
  }
}

/** One side is always fixed: whose condominiums, or whose members. */
function readFilters(params: URLSearchParams): MembershipFilters | null {
  const condominiumId = params.get('condominiumId')
  if (condominiumId) return { condominiumId }

  const userId = params.get('userId')
  return userId ? { userId } : null
}

export async function GET(request: Request): Promise<NextResponse> {
  if (!(await requester())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const filters = readFilters(new URL(request.url).searchParams)
  if (!filters) return NextResponse.json({ error: 'missing-filter' }, { status: 400 })

  return NextResponse.json(await getMembershipRepository().list(filters))
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!(await requireManager())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const input = (await request.json()) as MembershipInput
  const result = await addMember(ports(), input)

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: ADD_STATUS[result.error] })
  }

  return NextResponse.json(result.value, { status: 201 })
}

export async function PATCH(request: Request): Promise<NextResponse> {
  if (!(await requireManager())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const { userId, condominiumId, role } = (await request.json()) as MembershipInput
  const result = await changeMemberRole(
    getMembershipRepository(),
    userId,
    condominiumId,
    role,
  )

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 404 })

  return NextResponse.json(result.value)
}

export async function DELETE(request: Request): Promise<NextResponse> {
  if (!(await requireManager())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const params = new URL(request.url).searchParams
  const userId = params.get('userId')
  const condominiumId = params.get('condominiumId')

  if (!userId || !condominiumId) {
    return NextResponse.json({ error: 'missing-filter' }, { status: 400 })
  }

  const result = await removeMember(getMembershipRepository(), userId, condominiumId)

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 404 })

  return new NextResponse(null, { status: 204 })
}
