import { renderHook, waitFor } from '@testing-library/react'
import { useUser } from '@/hooks/use-user'
import { buildUser } from '@/tests/support/build-user'

const person = buildUser()

describe('useUser', () => {
  it('loads the person of that id', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => person }))

    const { result } = renderHook(() => useUser(person.id))

    await waitFor(() => expect(result.current.user?.email).toBe(person.email))
  })

  it('asks the API for that very person', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => person })
    vi.stubGlobal('fetch', fetchMock)

    renderHook(() => useUser(person.id))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(`/api/users/${person.id}`, expect.anything()),
    )
  })

  it('reports a failure instead of an empty screen', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))

    const { result } = renderHook(() => useUser(person.id))

    await waitFor(() => expect(result.current.error).toMatch(/não foi possível/i))
  })

  it('reports a failure when the network throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

    const { result } = renderHook(() => useUser(person.id))

    await waitFor(() => expect(result.current.error).toMatch(/não foi possível/i))
  })

  it('is loading until the answer arrives', () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => undefined)))

    const { result } = renderHook(() => useUser(person.id))

    expect(result.current.isLoading).toBe(true)
  })
})
