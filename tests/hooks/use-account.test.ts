import { renderHook, waitFor } from '@testing-library/react'
import { useAccount } from '@/hooks/use-account'
import { buildUser } from '@/tests/support/build-user'

const useSession = vi.fn()
vi.mock('next-auth/react', () => ({ useSession: () => useSession() }))

beforeEach(() => {
  useSession.mockReturnValue({ data: { user: { id: 'quem-entrou' } } })
})

const account = buildUser({ mustChangePassword: true })

describe('useAccount', () => {
  it('asks for nothing while the visitor is not signed in', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    renderHook(() => useAccount(false))

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('loads the signed-in person', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => account }),
    )

    const { result } = renderHook(() => useAccount(true))

    await waitFor(() => expect(result.current.account?.email).toBe(account.email))
  })

  it('reports nobody when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))

    const { result } = renderHook(() => useAccount(true))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.account).toBeNull()
  })

  it('reports nobody when the network throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

    const { result } = renderHook(() => useAccount(true))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.account).toBeNull()
  })
  it('flags a person who no longer exists', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))

    const { result } = renderHook(() => useAccount(true))

    await waitFor(() => expect(result.current.isGone).toBe(true))
  })

  it('flags a session the server no longer accepts', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }))

    const { result } = renderHook(() => useAccount(true))

    await waitFor(() => expect(result.current.isGone).toBe(true))
  })

  it('does not flag a network failure as a missing person', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

    const { result } = renderHook(() => useAccount(true))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.isGone).toBe(false)
  })
  it('pede de novo quando a identidade da sessão troca', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => account })
    vi.stubGlobal('fetch', fetchMock)

    const { rerender } = renderHook(() => useAccount(true))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    // é o que acontece ao impersonar alguém, e ao voltar a ser você
    useSession.mockReturnValue({ data: { user: { id: 'outra-pessoa' } } })
    rerender()

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
  })

  it('não fica pedindo à toa quando nada muda', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => account })
    vi.stubGlobal('fetch', fetchMock)

    const { rerender } = renderHook(() => useAccount(true))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    rerender()
    rerender()

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
