import { PrismaCondominiumRepository } from '@/infrastructure/repositories/prisma-condominium-repository'
import type { PrismaCondominiumDelegate } from '@/infrastructure/repositories/prisma-condominium-repository'
import { PrismaMembershipRepository } from '@/infrastructure/repositories/prisma-membership-repository'
import type { PrismaMembershipDelegate } from '@/infrastructure/repositories/prisma-membership-repository'
import { PrismaUserRepository } from '@/infrastructure/repositories/prisma-user-repository'
import type { PrismaUserDelegate } from '@/infrastructure/repositories/prisma-user-repository'
import { prisma } from './setup'

// Real repositories, real Postgres: a mock would happily accept a scope that
// the database ignores.
const condominiums = new PrismaCondominiumRepository(
  prisma.condominium as unknown as PrismaCondominiumDelegate,
)
const memberships = new PrismaMembershipRepository(
  prisma.condominiumMember as unknown as PrismaMembershipDelegate,
)
const users = new PrismaUserRepository(prisma.user as unknown as PrismaUserDelegate)

const page = { page: 1, pageSize: 10 }

async function reset(): Promise<void> {
  await prisma.condominiumMember.deleteMany()
  await prisma.condominium.deleteMany()
  await prisma.user.deleteMany()
}

beforeEach(reset)
afterAll(async () => {
  await reset()
  await prisma.$disconnect()
})

/** Aurora, with a manager; Vale Verde, with a resident of its own. */
async function twoCondominiums(): Promise<{
  managerId: string
  aurora: string
  valeVerde: string
  strangerId: string
}> {
  const aurora = await condominiums.create({ name: 'Aurora', address: 'Rua A' })
  const valeVerde = await condominiums.create({ name: 'Vale Verde', address: 'Rua B' })

  const manager = await users.create({ email: 'sindico@example.com', name: 'Ana', image: null })
  await users.update(manager.id, { role: 'MANAGER' })
  const stranger = await users.create({ email: 'outro@example.com', name: 'Bruno', image: null })

  await memberships.add({ userId: manager.id, condominiumId: aurora.id, role: 'MANAGER' })
  await memberships.add({ userId: stranger.id, condominiumId: valeVerde.id, role: 'RESIDENT' })

  return {
    managerId: manager.id,
    aurora: aurora.id,
    valeVerde: valeVerde.id,
    strangerId: stranger.id,
  }
}

describe('escopo do síndico contra o Postgres real', () => {
  it('não entrega ao síndico do Aurora o condomínio alheio', async () => {
    const { managerId } = await twoCondominiums()

    const found = await condominiums.list({}, page, { managedBy: managerId })

    expect(found.items.map((item) => item.name)).toEqual(['Aurora'])
  })

  it('não entrega o condomínio alheio nem pelo id', async () => {
    const { managerId, valeVerde } = await twoCondominiums()

    expect(await condominiums.findById(valeVerde, { managedBy: managerId })).toBeNull()
  })

  it('entrega o próprio condomínio pelo id', async () => {
    const { managerId, aurora } = await twoCondominiums()

    expect(await condominiums.findById(aurora, { managedBy: managerId })).not.toBeNull()
  })

  it('entrega os dois ao administrador', async () => {
    await twoCondominiums()

    expect((await condominiums.list({}, page, null)).total).toBe(2)
  })

  it('não trata como síndico quem apenas mora no condomínio', async () => {
    const { strangerId } = await twoCondominiums()

    expect((await condominiums.list({}, page, { managedBy: strangerId })).total).toBe(0)
  })

  it('não mostra ao síndico quem mora no condomínio alheio', async () => {
    const { aurora, strangerId } = await twoCondominiums()

    const found = await users.list({}, page, { inCondominiums: [aurora] })

    expect(found.items.map((item) => item.id)).not.toContain(strangerId)
  })

  it('mostra ao síndico quem está no condomínio dele', async () => {
    const { aurora, managerId } = await twoCondominiums()

    const found = await users.list({}, page, { inCondominiums: [aurora] })

    expect(found.items.map((item) => item.id)).toEqual([managerId])
  })

  it('não mostra ninguém ao síndico sem condomínio', async () => {
    await twoCondominiums()

    expect((await users.list({}, page, { inCondominiums: [] })).total).toBe(0)
  })
})
