import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client'
import { Argon2PasswordHasher } from '../infrastructure/security/argon2-password-hasher'

const DEFAULT_USERNAME = 'admin'
const DEFAULT_PASSWORD = 'admin'

/**
 * Creates the only account that can exist before anyone signs in.
 * The password is deliberately weak and `mustChangePassword` is true:
 * the first sign-in has to replace it.
 */
async function main(): Promise<void> {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  })
  const hasher = new Argon2PasswordHasher()

  const existing = await prisma.user.findFirst({
    where: { username: DEFAULT_USERNAME, deletedAt: null },
  })

  if (existing) {
    console.log(`Usuário "${DEFAULT_USERNAME}" já existe. Nada a fazer.`)
    await prisma.$disconnect()
    return
  }

  await prisma.user.create({
    data: {
      email: 'admin@local',
      name: 'Administrador',
      username: DEFAULT_USERNAME,
      passwordHash: await hasher.hash(DEFAULT_PASSWORD),
      mustChangePassword: true,
      role: 'ADMIN',
    },
  })

  console.log(`Usuário "${DEFAULT_USERNAME}" criado com a senha "${DEFAULT_PASSWORD}".`)
  console.log('A senha terá de ser trocada no primeiro acesso.')
  await prisma.$disconnect()
}

void main()
