import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UsersPage from '@/app/(app)/users/page'
import { setScreen } from '@/tests/support/match-media'
import type { Page, User } from '@/shared/types'
import { buildUser } from '@/tests/support/build-user'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

const useAccount = vi.fn()
vi.mock('@/hooks/use-account', () => ({ useAccount: (...a: unknown[]) => useAccount(...a) }))

const update = vi.fn()
vi.mock('next-auth/react', () => ({ useSession: () => ({ update }) }))

const useUsers = vi.fn()
vi.mock('@/hooks/use-users', () => ({ useUsers: (...args: unknown[]) => useUsers(...args) }))

const person: User = buildUser()

function pageOf(items: User[], pageCount = 1): Page<User> {
  return { items, total: items.length, page: 1, pageSize: 10, pageCount }
}

beforeEach(() => {
  useUsers.mockReset()
  useAccount.mockReset()
  update.mockReset()
  useAccount.mockReturnValue({
    account: buildUser({ id: 'admin-1', role: 'ADMIN' }),
    isLoading: false,
    isGone: false,
  })
  push.mockReset()
  setScreen('desktop')
})

/** The row menu answers to the right mouse button, as in the real table. */
function openRowMenu(): void {
  fireEvent.contextMenu(screen.getAllByText('Ana Souza')[0]!.closest('tr') as HTMLElement)
}

describe('UsersPage', () => {
  it('shows the screen title', () => {
    useUsers.mockReturnValue({ page: pageOf([person]), isLoading: false, error: null })

    render(<UsersPage />)

    expect(screen.getByRole('heading', { name: 'Usuários' })).toBeInTheDocument()
  })

  it('offers a search field', () => {
    useUsers.mockReturnValue({ page: pageOf([person]), isLoading: false, error: null })

    render(<UsersPage />)

    expect(screen.getByLabelText('Buscar usuários')).toBeInTheDocument()
  })

  it('offers the filters button', () => {
    useUsers.mockReturnValue({ page: pageOf([person]), isLoading: false, error: null })

    render(<UsersPage />)

    expect(screen.getByRole('button', { name: 'Filtros' })).toBeInTheDocument()
  })

  it('lists the people it received', () => {
    useUsers.mockReturnValue({ page: pageOf([person]), isLoading: false, error: null })

    render(<UsersPage />)

    // both shapes render; CSS decides which one the visitor sees
    expect(screen.getAllByText('ana@example.com').length).toBeGreaterThan(0)
  })

  it('says so while loading', () => {
    useUsers.mockReturnValue({ page: null, isLoading: true, error: null })

    render(<UsersPage />)

    expect(screen.getByText('Carregando…')).toBeInTheDocument()
  })

  it('says so when nothing matches', () => {
    useUsers.mockReturnValue({ page: pageOf([]), isLoading: false, error: null })

    render(<UsersPage />)

    expect(screen.getByText('Nenhum usuário encontrado.')).toBeInTheDocument()
  })

  it('reports a failure to load', () => {
    useUsers.mockReturnValue({
      page: null,
      isLoading: false,
      error: 'Não foi possível carregar os usuários.',
    })

    render(<UsersPage />)

    expect(screen.getByRole('alert')).toHaveTextContent(/não foi possível carregar/i)
  })

  it('hides the pager when everything fits on one page', () => {
    useUsers.mockReturnValue({ page: pageOf([person], 1), isLoading: false, error: null })

    render(<UsersPage />)

    expect(screen.queryByRole('button', { name: 'Página 1' })).not.toBeInTheDocument()
  })

  it('shows the pager when there is more than one page', () => {
    useUsers.mockReturnValue({ page: pageOf([person], 3), isLoading: false, error: null })

    render(<UsersPage />)

    expect(screen.getByRole('button', { name: 'Página 2' })).toBeInTheDocument()
  })

  it('searches by what the visitor typed', async () => {
    useUsers.mockReturnValue({ page: pageOf([person]), isLoading: false, error: null })

    render(<UsersPage />)
    await userEvent.type(screen.getByLabelText('Buscar usuários'), 'ana')

    expect(useUsers).toHaveBeenLastCalledWith({ search: 'ana' }, 1, 0)
  })

  it('opens the filters dialog', async () => {
    useUsers.mockReturnValue({ page: pageOf([person]), isLoading: false, error: null })

    render(<UsersPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Filtros' }))

    expect(screen.getByRole('button', { name: 'Aplicar' })).toBeInTheDocument()
  })
  it('reloads with the filters chosen in the dialog', async () => {
    useUsers.mockReturnValue({ page: pageOf([person]), isLoading: false, error: null })

    render(<UsersPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Filtros' }))
    await userEvent.click(screen.getByRole('radio', { name: 'Síndico' }))
    await userEvent.click(screen.getByRole('button', { name: 'Aplicar' }))

    expect(useUsers).toHaveBeenLastCalledWith({ role: 'MANAGER', status: 'all' }, 1, 0)
  })

  it('brings an inactive person back from the row menu', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    const inactive = buildUser({ deletedAt: new Date('2026-02-01') })
    useUsers.mockReturnValue({ page: pageOf([inactive]), isLoading: false, error: null })

    render(<UsersPage />)
    openRowMenu()
    await userEvent.click(screen.getByRole('menuitem', { name: 'Ativar' }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(`/api/users/${inactive.id}/restore`, {
        method: 'POST',
      }),
    )
  })

  it('goes to another page', async () => {
    useUsers.mockReturnValue({ page: pageOf([person], 3), isLoading: false, error: null })

    render(<UsersPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Página 2' }))

    expect(useUsers).toHaveBeenLastCalledWith({}, 2, 0)
  })
  it('deactivates a person from the row menu and reloads the list', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
    useUsers.mockReturnValue({ page: pageOf([person]), isLoading: false, error: null })

    render(<UsersPage />)
    openRowMenu()
    await userEvent.click(screen.getByRole('menuitem', { name: 'Desativar' }))
    await userEvent.click(screen.getByRole('button', { name: 'Desativar' }))

    await waitFor(() => expect(useUsers).toHaveBeenLastCalledWith({}, 1, 1))
  })

  it('closes the deactivate dialog on cancel', async () => {
    useUsers.mockReturnValue({ page: pageOf([person]), isLoading: false, error: null })

    render(<UsersPage />)
    openRowMenu()
    await userEvent.click(screen.getByRole('menuitem', { name: 'Desativar' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    await waitFor(() =>
      expect(screen.queryByText('Desativar usuário')).not.toBeInTheDocument(),
    )
  })
  it('clearing the search stops filtering by it', async () => {
    useUsers.mockReturnValue({ page: pageOf([person]), isLoading: false, error: null })

    render(<UsersPage />)
    const field = screen.getByLabelText('Buscar usuários')
    await userEvent.type(field, 'ana')
    await userEvent.clear(field)

    expect(useUsers).toHaveBeenLastCalledWith({ search: undefined }, 1, 0)
  })
  it('opens the detail screen of the person to edit', async () => {
    useUsers.mockReturnValue({ page: pageOf([person]), isLoading: false, error: null })

    render(<UsersPage />)
    openRowMenu()
    await userEvent.click(screen.getByRole('menuitem', { name: 'Editar' }))

    expect(push).toHaveBeenCalledWith(`/users/${person.id}`)
  })
  it('oferece ao administrador ver o sistema como a pessoa', async () => {
    useUsers.mockReturnValue({ page: pageOf([person]), isLoading: false, error: null })
    render(<UsersPage />)

    openRowMenu()

    expect(await screen.findByRole('menuitem', { name: /Ver como/ })).toBeInTheDocument()
  })

  it('não oferece isso ao síndico', async () => {
    useAccount.mockReturnValue({
      account: buildUser({ id: 'manager-1', role: 'MANAGER' }),
      isLoading: false,
      isGone: false,
    })
    useUsers.mockReturnValue({ page: pageOf([person]), isLoading: false, error: null })
    render(<UsersPage />)

    openRowMenu()

    await screen.findByRole('menuitem', { name: /Editar/ })
    expect(screen.queryByRole('menuitem', { name: /Ver como/ })).not.toBeInTheDocument()
  })

  it('não oferece impersonar outro administrador', async () => {
    useUsers.mockReturnValue({
      page: pageOf([{ ...person, role: 'ADMIN' }]),
      isLoading: false,
      error: null,
    })
    render(<UsersPage />)

    openRowMenu()

    await screen.findByRole('menuitem', { name: /Editar/ })
    expect(screen.queryByRole('menuitem', { name: /Ver como/ })).not.toBeInTheDocument()
  })

  it('troca a sessão e vai para o início ao impersonar', async () => {
    useUsers.mockReturnValue({ page: pageOf([person]), isLoading: false, error: null })
    render(<UsersPage />)

    openRowMenu()
    await userEvent.click(await screen.findByRole('menuitem', { name: /Ver como/ }))

    await waitFor(() => expect(update).toHaveBeenCalledWith({ impersonate: person.id }))
    expect(push).toHaveBeenCalledWith('/portal')
  })
  it('decide linha a linha: numa lista mista, o administrador não é impersonável', async () => {
    const outroAdmin = buildUser({ id: 'admin-2', name: 'Bruno Admin', role: 'ADMIN' })
    useUsers.mockReturnValue({
      page: pageOf([person, outroAdmin]),
      isLoading: false,
      error: null,
    })
    render(<UsersPage />)

    fireEvent.contextMenu(screen.getAllByText('Bruno Admin')[0]!.closest('tr') as HTMLElement)

    await screen.findByRole('menuitem', { name: /Editar/ })
    expect(screen.queryByRole('menuitem', { name: /Ver como/ })).not.toBeInTheDocument()
  })
})
