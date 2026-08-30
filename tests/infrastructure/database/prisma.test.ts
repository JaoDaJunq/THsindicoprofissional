const constructed = vi.fn()

vi.mock('@prisma/adapter-pg', () => ({ PrismaPg: vi.fn() }))
vi.mock('@/generated/prisma/client', () => ({
  PrismaClient: class {
    constructor() {
      constructed()
    }
  },
}))

beforeEach(() => {
  constructed.mockReset()
  delete (globalThis as { prisma?: unknown }).prisma
  vi.resetModules()
})

describe('prisma client', () => {
  it('creates a client on first import', async () => {
    await import('@/infrastructure/database/prisma')

    expect(constructed).toHaveBeenCalledTimes(1)
  })

  it('reuses the same client across hot reloads instead of opening a new pool', async () => {
    const first = (await import('@/infrastructure/database/prisma')).prisma
    vi.resetModules()

    const second = (await import('@/infrastructure/database/prisma')).prisma

    expect(second).toBe(first)
    expect(constructed).toHaveBeenCalledTimes(1)
  })
  it('does not cache on the global in production, where there is no hot reload', async () => {
    vi.stubEnv('NODE_ENV', 'production')

    await import('@/infrastructure/database/prisma')

    expect((globalThis as { prisma?: unknown }).prisma).toBeUndefined()
    vi.unstubAllEnvs()
  })
})
