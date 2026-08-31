import { prisma } from '@/infrastructure/database/prisma'
import type { CondominiumRepository } from '@/domain/repositories/condominium-repository'
import type { MembershipRepository } from '@/domain/repositories/membership-repository'
import type { UserRepository } from '@/domain/repositories/user-repository'
import { PrismaMembershipRepository } from './prisma-membership-repository'
import type { PrismaMembershipDelegate } from './prisma-membership-repository'
import { PrismaCondominiumRepository } from './prisma-condominium-repository'
import type { PrismaCondominiumDelegate } from './prisma-condominium-repository'
import { PrismaUserRepository } from './prisma-user-repository'
import type { PrismaUserDelegate } from './prisma-user-repository'

/** Composition root for repositories. */
export function getUserRepository(): UserRepository {
  return new PrismaUserRepository(prisma.user as unknown as PrismaUserDelegate)
}

export function getCondominiumRepository(): CondominiumRepository {
  return new PrismaCondominiumRepository(
    prisma.condominium as unknown as PrismaCondominiumDelegate,
  )
}

export function getMembershipRepository(): MembershipRepository {
  return new PrismaMembershipRepository(
    prisma.condominiumMember as unknown as PrismaMembershipDelegate,
  )
}
