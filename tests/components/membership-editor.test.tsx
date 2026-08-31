import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MembershipEditor } from '@/components/membership-editor'
import type { Membership } from '@/shared/types'

const membership: Membership = {
  id: 'm1',
  role: 'RESIDENT',
  user: { id: 'u1', name: 'Ana Souza', email: 'ana@example.com' },
  condominium: { id: 'c1', name: 'Residencial Aurora' },
}

const useMemberships = vi.fn()
vi.mock('@/hooks/use-memberships', () => ({
  useMemberships: (...args: unknown[]) => useMemberships(...args),
}))

const useSearch = vi.fn()
vi.mock('@/hooks/use-search', () => ({ useSearch: (...args: unknown[]) => useSearch(...args) }))

const found = [
  { id: 'u1', label: 'Ana Souza' },
  { id: 'u2', label: 'Bruno Lima' },
]

beforeEach(() => {
  useMemberships.mockReset()
  useMemberships.mockReturnValue({ memberships: [membership], isLoading: false, error: null })
  useSearch.mockReset()
  useSearch.mockReturnValue({ results: found, isLoading: false })
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }))
})

function renderEditor(): void {
  render(
    <MembershipEditor
      side={{ condominiumId: 'c1' }}
      resource="users"
      searchLabel="Buscar pessoa"
    />,
  )
}

/** Types into the search field and waits for the results to show up. */
async function search(term: string): Promise<void> {
  await userEvent.type(screen.getByLabelText('Buscar pessoa'), term)
}

describe('MembershipEditor', () => {
  it('lists who is already linked, by the other side', () => {
    renderEditor()

    expect(screen.getByText('Ana Souza')).toBeInTheDocument()
  })

  it('shows the role of each link', () => {
    renderEditor()

    expect(screen.getByText('Morador')).toBeInTheDocument()
  })

  it('says so while there is no link yet', () => {
    useMemberships.mockReturnValue({ memberships: [], isLoading: false, error: null })

    renderEditor()

    expect(screen.getByText('Ninguém vinculado ainda.')).toBeInTheDocument()
  })

  it('reports the failure the hook gives it', () => {
    useMemberships.mockReturnValue({ memberships: [], isLoading: false, error: 'deu ruim' })

    renderEditor()

    expect(screen.getByRole('alert')).toHaveTextContent('deu ruim')
  })

  it('links the chosen person to the fixed side', async () => {
    renderEditor()

    await search('bru')
    await userEvent.click(await screen.findByRole('option', { name: 'Bruno Lima' }))

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        '/api/memberships',
        expect.objectContaining({ method: 'POST' }),
      ),
    )
    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body))
    expect(body).toEqual({ condominiumId: 'c1', userId: 'u2', role: 'RESIDENT' })
  })

  it('leaves out of the results whoever is already linked', async () => {
    renderEditor()

    await search('a')

    expect(await screen.findByRole('option', { name: 'Bruno Lima' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Ana Souza' })).not.toBeInTheDocument()
  })

  it('searches the resource it was given, by what was typed', async () => {
    renderEditor()

    await search('bru')

    expect(useSearch).toHaveBeenLastCalledWith('users', 'bru')
  })

  it('asks nothing until someone types', () => {
    renderEditor()

    expect(useSearch).toHaveBeenLastCalledWith('users', '')
  })

  it('promotes a resident to manager of the condominium', async () => {
    renderEditor()

    await userEvent.click(screen.getByRole('button', { name: 'Tornar Ana Souza síndico' }))

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        '/api/memberships',
        expect.objectContaining({ method: 'PATCH' }),
      ),
    )
    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body))
    expect(body).toEqual({ condominiumId: 'c1', userId: 'u1', role: 'MANAGER' })
  })

  it('sends a manager back to being a resident', async () => {
    useMemberships.mockReturnValue({
      memberships: [{ ...membership, role: 'MANAGER' }],
      isLoading: false,
      error: null,
    })
    renderEditor()

    await userEvent.click(screen.getByRole('button', { name: 'Tornar Ana Souza morador' }))

    await waitFor(() => {
      const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body))
      expect(body.role).toBe('RESIDENT')
    })
  })

  it('asks for confirmation before unlinking', async () => {
    renderEditor()

    await userEvent.click(screen.getByRole('button', { name: 'Desvincular Ana Souza' }))

    expect(fetch).not.toHaveBeenCalled()
    expect(
      screen.getByRole('button', { name: 'Confirmar desvincular Ana Souza' }),
    ).toBeInTheDocument()
  })

  it('unlinks through the API of that pair on the second click', async () => {
    renderEditor()

    await userEvent.click(screen.getByRole('button', { name: 'Desvincular Ana Souza' }))
    await userEvent.click(
      screen.getByRole('button', { name: 'Confirmar desvincular Ana Souza' }),
    )

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith('/api/memberships?userId=u1&condominiumId=c1', {
        method: 'DELETE',
      }),
    )
  })

  it('goes back to asking once the link is gone', async () => {
    renderEditor()

    await userEvent.click(screen.getByRole('button', { name: 'Desvincular Ana Souza' }))
    await userEvent.click(
      screen.getByRole('button', { name: 'Confirmar desvincular Ana Souza' }),
    )

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Desvincular Ana Souza' })).toBeInTheDocument(),
    )
  })

  it('only ever waits for one confirmation at a time', async () => {
    useMemberships.mockReturnValue({
      memberships: [
        membership,
        { ...membership, id: 'm2', user: { id: 'u2', name: 'Bruno Lima', email: 'b@x' } },
      ],
      isLoading: false,
      error: null,
    })
    renderEditor()

    await userEvent.click(screen.getByRole('button', { name: 'Desvincular Ana Souza' }))
    await userEvent.click(screen.getByRole('button', { name: 'Desvincular Bruno Lima' }))

    expect(
      screen.queryByRole('button', { name: 'Confirmar desvincular Ana Souza' }),
    ).not.toBeInTheDocument()
  })

  it('lists the condominiums when the fixed side is a person', () => {
    useMemberships.mockReturnValue({ memberships: [membership], isLoading: false, error: null })

    render(
      <MembershipEditor
        side={{ userId: 'u1' }}
        resource="condominiums"
        searchLabel="Buscar condomínio"
      />,
    )

    expect(screen.getByText('Residencial Aurora')).toBeInTheDocument()
  })

  it('reports a failure instead of pretending it linked', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    renderEditor()

    await search('bru')
    await userEvent.click(await screen.findByRole('option', { name: 'Bruno Lima' }))

    await waitFor(() => expect(fetch).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/não foi possível/i))
  })

  it('says when the search found nobody new', async () => {
    useSearch.mockReturnValue({ results: [], isLoading: false })
    renderEditor()

    await search('zzz')

    expect(await screen.findByText('Ninguém encontrado.')).toBeInTheDocument()
  })
  it('falls back to the e-mail of whoever has no name', () => {
    useMemberships.mockReturnValue({
      memberships: [{ ...membership, user: { ...membership.user, name: null } }],
      isLoading: false,
      error: null,
    })

    renderEditor()

    expect(screen.getByText('ana@example.com')).toBeInTheDocument()
  })
  it('says in the field what is searched there', () => {
    renderEditor()

    expect(screen.getByLabelText('Buscar pessoa')).toHaveAttribute(
      'placeholder',
      'escreva o nome da pessoa...',
    )
  })

  it('says the same for the condominium side', () => {
    render(
      <MembershipEditor
        side={{ userId: 'u1' }}
        resource="condominiums"
        searchLabel="Buscar condomínio"
      />,
    )

    expect(screen.getByLabelText('Buscar condomínio')).toHaveAttribute(
      'placeholder',
      'escreva o nome do condomínio...',
    )
  })
  it('puts the search above whoever is already linked', () => {
    renderEditor()

    const field = screen.getByLabelText('Buscar pessoa')
    const linked = screen.getByText('Ana Souza')

    expect(field.compareDocumentPosition(linked)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  })
})
