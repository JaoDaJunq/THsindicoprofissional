import { withSoftDeleteAwareLookup } from '@/infrastructure/auth/adapter'
import type { Adapter } from 'next-auth/adapters'

const findFirst = vi.fn()
const baseGetUserByEmail = vi.fn()

const base = { getUserByEmail: baseGetUserByEmail, createUser: vi.fn() } as unknown as Adapter

beforeEach(() => {
  findFirst.mockReset().mockResolvedValue(null)
  baseGetUserByEmail.mockReset()
})

const adapter = (): Adapter => withSoftDeleteAwareLookup(base, { findFirst })

describe('withSoftDeleteAwareLookup', () => {
  it('keeps the rest of the adapter untouched', () => {
    expect(adapter().createUser).toBe(base.createUser)
  })

  it('looks the e-mail up with findFirst, since it is no longer a unique column', async () => {
    await adapter().getUserByEmail?.('ana@example.com')

    expect(findFirst).toHaveBeenCalledWith({
      where: { email: 'ana@example.com', deletedAt: null },
    })
    expect(baseGetUserByEmail).not.toHaveBeenCalled()
  })

  it('ignores a soft-deleted person, so signing in again creates a fresh user', async () => {
    findFirst.mockResolvedValue(null)

    expect(await adapter().getUserByEmail?.('removida@example.com')).toBeNull()
  })

  it('returns the active person when there is one', async () => {
    const person = { id: 'abc', email: 'ana@example.com' }
    findFirst.mockResolvedValue(person)

    expect(await adapter().getUserByEmail?.('ana@example.com')).toBe(person)
  })
})
