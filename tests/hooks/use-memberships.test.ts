import { renderHook, waitFor } from '@testing-library/react'
import { useMemberships } from '@/hooks/use-memberships'
import type { Membership } from '@/shared/types'

const membership: Membership = {
  id: 'm1',
  role: 'RESIDENT',
  user: { id: 'u1', name: 'Ana', email: 'ana@example.com' },
  condominium: { id: 'c1', name: 'Aurora' },
}

describe('useMemberships', () => {
  it('asks for the links of one condominium', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [membership] })
    vi.stubGlobal('fetch', fetchMock)

    renderHook(() => useMemberships({ condominiumId: 'c1' }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/memberships?condominiumId=c1',
        expect.anything(),
      ),
    )
  })

  it('asks for the links of one person', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [] })
    vi.stubGlobal('fetch', fetchMock)

    renderHook(() => useMemberships({ userId: 'u1' }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith('/api/memberships?userId=u1', expect.anything()),
    )
  })

  it('hands over what came back', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [membership] }))

    const { result } = renderHook(() => useMemberships({ condominiumId: 'c1' }))

    await waitFor(() => expect(result.current.memberships).toHaveLength(1))
  })

  it('reports a failure instead of an empty list', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))

    const { result } = renderHook(() => useMemberships({ condominiumId: 'c1' }))

    await waitFor(() => expect(result.current.error).toMatch(/não foi possível/i))
  })

  it('reports a failure when the network throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

    const { result } = renderHook(() => useMemberships({ userId: 'u1' }))

    await waitFor(() => expect(result.current.error).toMatch(/não foi possível/i))
  })

  it('is loading until the answer arrives', () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => undefined)))

    const { result } = renderHook(() => useMemberships({ condominiumId: 'c1' }))

    expect(result.current.isLoading).toBe(true)
  })
})
