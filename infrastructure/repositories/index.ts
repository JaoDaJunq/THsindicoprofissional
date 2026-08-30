import { prisma } from '@/infrastructure/database/prisma'
import type { UserRepository } from '@/domain/repositories/user-repository'
import { PrismaUserRepository } from './prisma-user-repository'
import type { PrismaUserDelegate } from './prisma-user-repository'

/** Composition root for repositories. */
export function getUserRepository(): UserRepository {
  return new PrismaUserRepository(prisma.user as unknown as PrismaUserDelegate)
}
