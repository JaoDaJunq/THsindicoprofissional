import { impersonates } from '@/domain/authorization'
import type { UserRepository } from '@/domain/repositories/user-repository'
import type { UserId } from '@/shared/types'

/** What the browser asked for. Auth.js hands this over unvalidated, on purpose. */
export interface ImpersonationRequest {
  impersonate?: unknown
  stopImpersonating?: unknown
}

/** The two ids a token carries: who it acts as, and who really owns it. */
export interface TokenIdentity {
  sub?: UserId
  impersonatorId?: UserId
}

/**
 * Decides the token after an update. The payload comes from the client, so
 * nothing here trusts it: the administrator is read from the database, from the
 * id the token already carried, and a request that does not check out returns
 * the token untouched rather than failing loudly — the browser gets no signal
 * to probe with.
 */
export async function applyImpersonation(
  token: TokenIdentity,
  request: ImpersonationRequest,
  users: UserRepository,
): Promise<TokenIdentity> {
  if (request.stopImpersonating === true) {
    return token.impersonatorId ? { sub: token.impersonatorId } : token
  }

  if (typeof request.impersonate !== 'string') return token

  // Whoever owns the token is the one asking — never the person it acts as.
  const ownerId = token.impersonatorId ?? token.sub
  if (!ownerId) return token

  const owner = await users.findById(ownerId)
  const target = await users.findById(request.impersonate)

  if (!owner || !target || !impersonates(owner, target)) return token

  return { sub: target.id, impersonatorId: owner.id }
}
