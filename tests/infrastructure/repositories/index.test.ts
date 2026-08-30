import { getUserRepository } from '@/infrastructure/repositories'
import { PrismaUserRepository } from '@/infrastructure/repositories/prisma-user-repository'

vi.mock('@/infrastructure/database/prisma', () => ({ prisma: { user: {} } }))

describe('getUserRepository', () => {
  it('hands back a repository backed by Prisma', () => {
    expect(getUserRepository()).toBeInstanceOf(PrismaUserRepository)
  })
})
