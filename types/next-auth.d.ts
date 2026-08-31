import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      /** True while an administrator is seeing the system as this person. */
      isImpersonated: boolean
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    /** The administrator who owns this token while impersonating someone. */
    impersonatorId?: string
  }
}
