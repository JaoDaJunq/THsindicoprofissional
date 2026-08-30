/** Shared between server and client. Never import Prisma types from here. */

export type UserId = string

export interface User {
  id: UserId
  email: string
  name: string | null
  image: string | null
  username: string | null
  /** True until the person replaces the password they were handed. */
  mustChangePassword: boolean
  /** Building manager ("síndico"). Never self-assigned. */
  isManager: boolean
  isActive: boolean
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
  image?: string | null
  isManager?: boolean
  isActive?: boolean
}

/** Mirrors the columns the table shows, so the UI can only filter what it displays. */
export interface UserFilters {
  search?: string
  isManager?: boolean
  isActive?: boolean
}
