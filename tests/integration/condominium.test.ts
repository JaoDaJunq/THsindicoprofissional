import { PrismaCondominiumRepository } from '@/infrastructure/repositories/prisma-condominium-repository'
import type { PrismaCondominiumDelegate } from '@/infrastructure/repositories/prisma-condominium-repository'
import { createCondominium } from '@/application/use-cases/create-condominium'
import { softDeleteCondominium } from '@/application/use-cases/soft-delete-condominium'
import { PrismaMembershipRepository } from '@/infrastructure/repositories/prisma-membership-repository'
import type { PrismaMembershipDelegate } from '@/infrastructure/repositories/prisma-membership-repository'
import { PrismaUserRepository } from '@/infrastructure/repositories/prisma-user-repository'
import type { PrismaUserDelegate } from '@/infrastructure/repositories/prisma-user-repository'
import { addMember } from '@/application/use-cases/add-member'
import { removeMember } from '@/application/use-cases/remove-member'
import { changeMemberRole } from '@/application/use-cases/change-member-role'
import { prisma } from './setup'

// Real repository, real Postgres: this is the pass that catches a query — or a
// generated client — the mocks would happily accept.
const repository = new PrismaCondominiumRepository(
  prisma.condominium as unknown as PrismaCondominiumDelegate,
)

const memberships = new PrismaMembershipRepository(
  prisma.condominiumMember as unknown as PrismaMembershipDelegate,
)
const users = new PrismaUserRepository(prisma.user as unknown as PrismaUserDelegate)

async function reset(): Promise<void> {
  await prisma.condominiumMember.deleteMany()
  await prisma.condominium.deleteMany()
  await prisma.user.deleteMany()
}

/** One condominium and one person, both freshly stored. */
async function pair(): Promise<{ userId: string; condominiumId: string }> {
  const created = await createCondominium(repository, input)
  if (!created.ok) throw new Error('fixture failed')
  const user = await users.create({ email: 'ana@example.com', name: 'Ana', image: null })

  return { userId: user.id, condominiumId: created.value.id }
}

beforeEach(reset)
afterAll(async () => {
  await reset()
  await prisma.$disconnect()
})

const input = { name: 'Residencial Aurora', address: 'Rua A, 10', cnpj: '12345678000199' }

describe('condomínio contra o Postgres real', () => {
  it('lists what was stored', async () => {
    await createCondominium(repository, input)

    const page = await repository.list({}, { page: 1, pageSize: 10 })

    expect(page.items.map((item) => item.name)).toEqual(['Residencial Aurora'])
  })

  it('searches by name, address and cnpj at once', async () => {
    await createCondominium(repository, input)

    const page = await repository.list({ search: 'rua a' }, { page: 1, pageSize: 10 })

    expect(page.total).toBe(1)
  })

  it('hides an excluded condominium from the listing', async () => {
    const created = await createCondominium(repository, input)
    if (!created.ok) throw new Error('fixture failed')

    await softDeleteCondominium(repository, created.value.id)

    expect((await repository.list({}, { page: 1, pageSize: 10 })).total).toBe(0)
  })

  it('frees the cnpj of an excluded condominium for a new one', async () => {
    const created = await createCondominium(repository, input)
    if (!created.ok) throw new Error('fixture failed')
    await softDeleteCondominium(repository, created.value.id)

    const again = await createCondominium(repository, input)

    expect(again.ok).toBe(true)
  })

  it('refuses two active condominiums with the same cnpj', async () => {
    await createCondominium(repository, input)

    const again = await createCondominium(repository, { ...input, name: 'Outro' })

    expect(again).toEqual({ ok: false, error: 'cnpj-already-registered' })
  })

  it('counts a linked resident in the condominium listing', async () => {
    const { userId, condominiumId } = await pair()

    await addMember({ memberships, users, condominiums: repository }, {
      userId,
      condominiumId,
      role: 'RESIDENT',
    })

    const page = await repository.list({}, { page: 1, pageSize: 10 })
    expect(page.items[0]?.residentsCount).toBe(1)
  })

  it('leaves the manager of the condominium out of the resident count', async () => {
    const { userId, condominiumId } = await pair()
    await addMember({ memberships, users, condominiums: repository }, {
      userId,
      condominiumId,
      role: 'RESIDENT',
    })

    await changeMemberRole(memberships, userId, condominiumId, 'MANAGER')

    const page = await repository.list({}, { page: 1, pageSize: 10 })
    expect(page.items[0]?.residentsCount).toBe(0)
  })

  it('stops counting someone who was unlinked', async () => {
    const { userId, condominiumId } = await pair()
    await addMember({ memberships, users, condominiums: repository }, {
      userId,
      condominiumId,
      role: 'RESIDENT',
    })

    await removeMember(memberships, userId, condominiumId)

    const page = await repository.list({}, { page: 1, pageSize: 10 })
    expect(page.items[0]?.residentsCount).toBe(0)
  })

  it('links the same pair again after it was unlinked', async () => {
    const { userId, condominiumId } = await pair()
    const ports = { memberships, users, condominiums: repository }
    await addMember(ports, { userId, condominiumId, role: 'RESIDENT' })
    await removeMember(memberships, userId, condominiumId)

    const again = await addMember(ports, { userId, condominiumId, role: 'RESIDENT' })

    expect(again.ok).toBe(true)
  })
})
