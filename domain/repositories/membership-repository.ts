import type {
  CondominiumRole,
  Membership,
  MembershipFilters,
  MembershipInput,
} from '@/shared/types'

/**
 * Port. Implemented by infrastructure, consumed by use cases.
 *
 * Every read here excludes soft-deleted links. Callers must not have to
 * remember that — see `.claude/rules/soft-delete.md`.
 */
export interface MembershipRepository {
  list(filters: MembershipFilters): Promise<Membership[]>
  find(userId: string, condominiumId: string): Promise<Membership | null>
  add(input: MembershipInput): Promise<Membership>
  /** Null when there is no active link between the two. */
  setRole(
    userId: string,
    condominiumId: string,
    role: CondominiumRole,
  ): Promise<Membership | null>
  /** Soft delete. False when there is no active link between the two. */
  remove(userId: string, condominiumId: string): Promise<boolean>
}
