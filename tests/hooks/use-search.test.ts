import { act, renderHook, waitFor } from '@testing-library/react'
import { useSearch } from '@/hooks/use-search'
import { buildCondominium } from '@/tests/support/build-condominium'
import { buildUser } from '@/tests/support/build-user'

function answers(items: unknown[]): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items }) }),
  )
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  vi.useRealTimers()
})

const settle = async (): Promise<void> => {
  await act(async () => {
    vi.advanceTimersByTime(300)
  })
}

describe('useSearch', () => {
  it('asks nothing while nothing was typed', async () => {
    answers([])

    renderHook(() => useSearch('users', ''))
    await settle()

    expect(fetch).not.toHaveBeenCalled()
  })

  it('searches the people by the term that was typed', async () => {
    answers([buildUser()])

    renderHook(() => useSearch('users', 'ana'))
    await settle()

    expect(fetch).toHaveBeenCalledWith(
      '/api/users?search=ana&pageSize=10',
      expect.anything(),
    )
  })

  it('searches the condominiums on the other resource', async () => {
    answers([buildCondominium()])

    renderHook(() => useSearch('condominiums', 'aurora'))
    await settle()

    expect(fetch).toHaveBeenCalledWith(
      '/api/condominiums?search=aurora&pageSize=10',
      expect.anything(),
    )
  })

  it('names a person by their name', async () => {
    answers([buildUser()])

    const { result } = renderHook(() => useSearch('users', 'ana'))
    await settle()

    await waitFor(() => expect(result.current.results[0]?.label).toBe('Ana Souza'))
  })

  it('falls back to the e-mail of whoever has no name', async () => {
    answers([buildUser({ name: null })])

    const { result } = renderHook(() => useSearch('users', 'ana'))
    await settle()

    await waitFor(() => expect(result.current.results[0]?.label).toBe('ana@example.com'))
  })

  it('names a condominium by its name', async () => {
    answers([buildCondominium()])

    const { result } = renderHook(() => useSearch('condominiums', 'aurora'))
    await settle()

    await waitFor(() => expect(result.current.results[0]?.label).toBe('Residencial Aurora'))
  })

  it('waits for the typing to stop before asking', async () => {
    answers([])

    const { rerender } = renderHook(({ term }) => useSearch('users', term), {
      initialProps: { term: 'a' },
    })
    rerender({ term: 'an' })
    rerender({ term: 'ana' })
    await settle()

    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('answers with nothing when the search fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))

    const { result } = renderHook(() => useSearch('users', 'ana'))
    await settle()

    await waitFor(() => expect(result.current.results).toEqual([]))
  })

  it('answers with nothing when the network throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

    const { result } = renderHook(() => useSearch('users', 'ana'))
    await settle()

    await waitFor(() => expect(result.current.results).toEqual([]))
  })
})
