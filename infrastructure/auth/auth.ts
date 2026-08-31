import NextAuth from 'next-auth'
import type { NextAuthResult } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { authenticateUser } from '@/application/use-cases/authenticate-user'
import { prisma } from '@/infrastructure/database/prisma'
import { getUserRepository } from '@/infrastructure/repositories'
import { Argon2PasswordHasher } from '@/infrastructure/security/argon2-password-hasher'
import { withSoftDeleteAwareLookup } from './adapter'
import { applyImpersonation } from './impersonation'
import { readCredentials } from './credentials'

const result: NextAuthResult = NextAuth({
  adapter: withSoftDeleteAwareLookup(PrismaAdapter(prisma), prisma.user),
  // Credentials only works with JWT sessions, so both providers use it.
  session: { strategy: 'jwt' },
  // Behind docker the request host is the bind address; AUTH_URL is what the
  // browser actually used, and Google validates the redirect against it.
  trustHost: true,
  providers: [
    Google,
    Credentials({
      name: 'Usuário e senha',
      credentials: {
        username: { label: 'Usuário', type: 'text' },
        password: { label: 'Senha', type: 'password' },
      },
      authorize: async (raw) => {
        const credentials = readCredentials(raw)
        if (!credentials) return null

        const authenticated = await authenticateUser(
          getUserRepository(),
          new Argon2PasswordHasher(),
          credentials,
        )
        if (!authenticated.ok) return null

        const { id, email, name, image } = authenticated.value
        return { id, email, name, image }
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user, trigger, session }) => {
      if (user?.id) token.sub = user.id

      // The update payload comes from the browser; applyImpersonation is what
      // decides, reading the administrator back from the database.
      if (trigger === 'update') {
        const decided = await applyImpersonation(
          { sub: token.sub, impersonatorId: token.impersonatorId },
          (session ?? {}) as Record<string, unknown>,
          getUserRepository(),
        )
        token.sub = decided.sub
        token.impersonatorId = decided.impersonatorId
      }

      return token
    },
    session: async ({ session, token }) => {
      if (token.sub) session.user.id = token.sub
      // The banner needs to know; nothing else does.
      session.user.isImpersonated = Boolean(token.impersonatorId)
      return session
    },
  },
  pages: { signIn: '/signin' },
})

export const handlers: NextAuthResult['handlers'] = result.handlers
export const auth: NextAuthResult['auth'] = result.auth
export const signIn: NextAuthResult['signIn'] = result.signIn
export const signOut: NextAuthResult['signOut'] = result.signOut
