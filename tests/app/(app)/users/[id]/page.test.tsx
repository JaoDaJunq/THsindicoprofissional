import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UserDetailPage from '@/app/(app)/users/[id]/page'
import { buildUser } from '@/tests/support/build-user'
import { buildCondominium } from '@/tests/support/build-condominium'
import type { User } from '@/shared/types'

const person: User = buildUser({ username: 'ana' })

const push = vi.fn()
const useUser = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useParams: () => ({ id: person.id }),
}))
vi.mock('@/hooks/use-user', () => ({ useUser: (...args: unknown[]) => useUser(...args) }))

const useMemberships = vi.fn().mockReturnValue({ memberships: [], isLoading: false, error: null })
vi.mock('@/hooks/use-memberships', () => ({
  useMemberships: (...args: unknown[]) => useMemberships(...args),
}))

const useSearch = vi.fn().mockReturnValue({ results: [], isLoading: false })
vi.mock('@/hooks/use-search', () => ({ useSearch: (...args: unknown[]) => useSearch(...args) }))

function loaded(overrides: Partial<User> = {}): void {
  useUser.mockReturnValue({ user: { ...person, ...overrides }, isLoading: false, error: null })
}

beforeEach(() => {
  push.mockReset()
  useUser.mockReset()
  loaded()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => person }))
})

async function save(): Promise<void> {
  await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
}

describe('UserDetailPage', () => {
  it('shows the contact of the person being edited', () => {
    render(<UserDetailPage />)

    expect(screen.getByLabelText('Nome')).toHaveValue('Ana Souza')
    expect(screen.getByLabelText('E-mail')).toHaveValue('ana@example.com')
  })

  it('says whether the person is a manager', () => {
    loaded({ isManager: true })

    render(<UserDetailPage />)

    expect(screen.getByRole('switch', { name: 'Síndico' })).toBeChecked()
  })

  it('says so while loading', () => {
    useUser.mockReturnValue({ user: null, isLoading: true, error: null })

    render(<UserDetailPage />)

    expect(screen.getByText('Carregando…')).toBeInTheDocument()
  })

  it('reports a person it could not load', () => {
    useUser.mockReturnValue({
      user: null,
      isLoading: false,
      error: 'Não foi possível carregar essa pessoa.',
    })

    render(<UserDetailPage />)

    expect(screen.getByRole('alert')).toHaveTextContent(/não foi possível carregar/i)
  })

  it('saves the contact and the role', async () => {
    render(<UserDetailPage />)

    await userEvent.clear(screen.getByLabelText('Nome'))
    await userEvent.type(screen.getByLabelText('Nome'), 'Ana Paula')
    await userEvent.click(screen.getByRole('switch', { name: 'Síndico' }))
    await save()

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(`/api/users/${person.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'Ana Paula',
          email: 'ana@example.com',
          isManager: true,
        }),
      }),
    )
  })

  it('goes back to the list once it saved', async () => {
    render(<UserDetailPage />)

    await save()

    await waitFor(() => expect(push).toHaveBeenCalledWith('/users'))
  })

  it('sets the access when a password was typed', async () => {
    render(<UserDetailPage />)

    await userEvent.type(screen.getByLabelText('Nova senha'), 'uma-senha-longa')
    await save()

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(`/api/users/${person.id}/credentials`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: 'ana', password: 'uma-senha-longa' }),
      }),
    )
  })

  it('leaves the access alone when no password was typed', async () => {
    render(<UserDetailPage />)

    await save()

    expect(fetch).not.toHaveBeenCalledWith(
      `/api/users/${person.id}/credentials`,
      expect.anything(),
    )
  })

  it('explains an e-mail that belongs to someone else', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'email-already-registered' }) }),
    )
    render(<UserDetailPage />)

    await save()

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/e-mail já está em uso/i),
    )
  })

  it('offers a way back without saving', async () => {
    render(<UserDetailPage />)

    await userEvent.click(screen.getByRole('button', { name: 'Voltar' }))

    expect(push).toHaveBeenCalledWith('/users')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('lets the manager link this person to condominiums', () => {
    loaded()

    render(<UserDetailPage />)

    expect(screen.getByRole('heading', { name: 'Condomínios' })).toBeInTheDocument()
    expect(screen.getByLabelText('Buscar condomínio')).toBeInTheDocument()
  })

  it('asks for the links of this very person', () => {
    loaded()

    render(<UserDetailPage />)

    expect(useMemberships).toHaveBeenCalledWith({ userId: person.id }, expect.any(Number))
  })

  it('offers the condominiums the search found', async () => {
    useSearch.mockReturnValue({
      results: [{ id: buildCondominium().id, label: 'Residencial Aurora' }],
      isLoading: false,
    })
    loaded()
    render(<UserDetailPage />)

    await userEvent.type(screen.getByLabelText('Buscar condomínio'), 'aur')

    expect(await screen.findByRole('option', { name: 'Residencial Aurora' })).toBeInTheDocument()
  })
})
