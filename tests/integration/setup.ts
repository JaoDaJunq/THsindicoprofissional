import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/generated/prisma/client'

/**
 * These tests truncate tables, so they refuse to run against the dev database.
 * `DATABASE_URL_TEST` must point at a separate database.
 */
const connectionString = process.env.DATABASE_URL_TEST

if (!connectionString) {
  throw new Error('DATABASE_URL_TEST is not set: refusing to run against the dev database.')
}

export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
})

export async function resetUsers(): Promise<void> {
  await prisma.session.deleteMany()
  await prisma.account.deleteMany()
  await prisma.user.deleteMany()
}
