/** Shared between server and client. Never import Prisma types from here. */

export type UserId = string

/**
 * What the person can do system-wide. Where they do it comes from the
 * membership — see `CondominiumRole` in `membership.ts`.
 */
export type UserRole = 'ADMIN' | 'MANAGER' | 'RESIDENT'

export interface User {
  id: UserId
  email: string
  name: string | null
  image: string | null
  username: string | null
  /** True until the person replaces the password they were handed. */
  mustChangePassword: boolean
  /** Never self-assigned: only an administrator changes it. */
  role: UserRole
  /** Null while the person is active; the date they were excluded otherwise. */
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface CreateUserInput {
  email: string
  name: string | null
  image: string | null
}

export interface SetCredentialsInput {
  username: string
  password: string
}

export interface UpdateUserInput {
  name?: string | null
  email?: string
  image?: string | null
  role?: UserRole
}

/** Being active is not a column: it is whether the person was excluded. */
export type UserStatus = 'all' | 'active' | 'inactive'

/** Mirrors the columns the table shows, so the UI can only filter what it displays. */
export interface UserFilters {
  search?: string
  id?: string
  name?: string
  email?: string
  role?: UserRole
  status?: UserStatus
}
