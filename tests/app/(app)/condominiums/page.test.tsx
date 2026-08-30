import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CondominiumsPage from '@/app/(app)/condominiums/page'
import { setScreen } from '@/tests/support/match-media'
import type { Condominium, Page } from '@/shared/types'
import { buildCondominium } from '@/tests/support/build-condominium'
import { buildUser } from '@/tests/support/build-user'

const buildCondominiumAdmin = () => buildUser({ role: 'ADMIN' })

const useCondominiums = vi.fn()
vi.mock('@/hooks/use-condominiums', () => ({
  useCondominiums: (...args: unknown[]) => useCondominiums(...args),
}))

const useAccount = vi.fn()
vi.mock('@/hooks/use-account', () => ({
  useAccount: (...args: unknown[]) => useAccount(...args),
}))

const condominium: Condominium = buildCondominium()

function pageOf(items: Condominium[], pageCount = 1): Page<Condominium> {
  return { items, total: items.length, page: 1, pageSize: 10, pageCount }
}

beforeEach(() => {
  useCondominiums.mockReset()
  useAccount.mockReset()
  useAccount.mockReturnValue({
    account: buildCondominiumAdmin(),
    isLoading: false,
    isGone: false,
  })
  setScreen('desktop')
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
})

function openRowMenu(): void {
  fireEvent.contextMenu(
    screen.getAllByText('Residencial Aurora')[0]!.closest('tr') as HTMLElement,
  )
}

describe('CondominiumsPage', () => {
  it('shows the screen title', () => {
    useCondominiums.mockReturnValue({ page: pageOf([condominium]), isLoading: false, error: null })

    render(<CondominiumsPage />)

    expect(screen.getByRole('heading', { name: 'Condomínios' })).toBeInTheDocument()
  })

  it('offers a search field', () => {
    useCondominiums.mockReturnValue({ page: pageOf([condominium]), isLoading: false, error: null })

    render(<CondominiumsPage />)

    expect(screen.getByLabelText('Buscar condomínios')).toBeInTheDocument()
  })

  it('lists what it received', () => {
    useCondominiums.mockReturnValue({ page: pageOf([condominium]), isLoading: false, error: null })

    render(<CondominiumsPage />)

    expect(screen.getAllByText('Residencial Aurora').length).toBeGreaterThan(0)
  })

  it('says so while loading', () => {
    useCondominiums.mockReturnValue({ page: null, isLoading: true, error: null })

    render(<CondominiumsPage />)

    expect(screen.getByText('Carregando…')).toBeInTheDocument()
  })

  it('says so when nothing matches', () => {
    useCondominiums.mockReturnValue({ page: pageOf([]), isLoading: false, error: null })

    render(<CondominiumsPage />)

    expect(screen.getByText('Nenhum condomínio encontrado.')).toBeInTheDocument()
  })

  it('reports the failure the hook gives it', () => {
    useCondominiums.mockReturnValue({ page: null, isLoading: false, error: 'deu ruim' })

    render(<CondominiumsPage />)

    expect(screen.getByRole('alert')).toHaveTextContent('deu ruim')
  })

  it('opens an empty form to create a condominium', async () => {
    useCondominiums.mockReturnValue({ page: pageOf([condominium]), isLoading: false, error: null })
    render(<CondominiumsPage />)

    await userEvent.click(screen.getByRole('button', { name: 'Novo condomínio' }))

    expect(await screen.findByRole('heading', { name: 'Novo condomínio' })).toBeInTheDocument()
  })

  it('opens the form already filled to edit a condominium', async () => {
    useCondominiums.mockReturnValue({ page: pageOf([condominium]), isLoading: false, error: null })
    render(<CondominiumsPage />)

    openRowMenu()
    await userEvent.click(await screen.findByRole('menuitem', { name: /Editar/ }))

    expect(await screen.findByRole('heading', { name: 'Editar condomínio' })).toBeInTheDocument()
  })

  it('asks before deactivating', async () => {
    useCondominiums.mockReturnValue({ page: pageOf([condominium]), isLoading: false, error: null })
    render(<CondominiumsPage />)

    openRowMenu()
    await userEvent.click(await screen.findByRole('menuitem', { name: /Desativar/ }))

    expect(await screen.findByRole('heading', { name: 'Desativar condomínio' })).toBeInTheDocument()
  })

  it('activates an excluded condominium without asking', async () => {
    const excluded = { ...condominium, deletedAt: new Date('2026-02-01') }
    useCondominiums.mockReturnValue({ page: pageOf([excluded]), isLoading: false, error: null })
    render(<CondominiumsPage />)

    openRowMenu()
    await userEvent.click(await screen.findByRole('menuitem', { name: /Ativar/ }))

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(`/api/condominiums/${excluded.id}/restore`, {
        method: 'POST',
      }),
    )
  })

  it('asks the hook for what was searched', async () => {
    useCondominiums.mockReturnValue({ page: pageOf([condominium]), isLoading: false, error: null })
    render(<CondominiumsPage />)

    await userEvent.type(screen.getByLabelText('Buscar condomínios'), 'aurora')

    await waitFor(() =>
      expect(useCondominiums).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: 'aurora' }),
        1,
        expect.any(Number),
      ),
    )
  })

  it('asks the hook for the filters that were applied', async () => {
    useCondominiums.mockReturnValue({ page: pageOf([condominium]), isLoading: false, error: null })
    render(<CondominiumsPage />)

    await userEvent.click(screen.getByRole('button', { name: 'Filtros' }))
    await userEvent.type(await screen.findByLabelText('Nome'), 'Aurora')
    await userEvent.click(screen.getByRole('button', { name: 'Aplicar' }))

    await waitFor(() =>
      expect(useCondominiums).toHaveBeenLastCalledWith(
        expect.objectContaining({ name: 'Aurora' }),
        1,
        expect.any(Number),
      ),
    )
  })

  it('closes the form when it is cancelled', async () => {
    useCondominiums.mockReturnValue({ page: pageOf([condominium]), isLoading: false, error: null })
    render(<CondominiumsPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Novo condomínio' }))

    await userEvent.click(await screen.findByRole('button', { name: 'Cancelar' }))

    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Novo condomínio' })).not.toBeInTheDocument(),
    )
  })

  it('goes to the page that was chosen', async () => {
    useCondominiums.mockReturnValue({
      page: pageOf([condominium], 3),
      isLoading: false,
      error: null,
    })
    render(<CondominiumsPage />)

    await userEvent.click(screen.getByLabelText('Página 2'))

    await waitFor(() =>
      expect(useCondominiums).toHaveBeenLastCalledWith({}, 2, expect.any(Number)),
    )
  })

  it('shows the pagination only when there is more than one page', () => {
    useCondominiums.mockReturnValue({
      page: pageOf([condominium], 3),
      isLoading: false,
      error: null,
    })

    render(<CondominiumsPage />)

    expect(screen.getByLabelText('Página 2')).toBeInTheDocument()
  })
  it('closes the deactivation without deactivating when cancelled', async () => {
    useCondominiums.mockReturnValue({ page: pageOf([condominium]), isLoading: false, error: null })
    render(<CondominiumsPage />)
    openRowMenu()
    await userEvent.click(await screen.findByRole('menuitem', { name: /Desativar/ }))

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    await waitFor(() =>
      expect(
        screen.queryByRole('heading', { name: 'Desativar condomínio' }),
      ).not.toBeInTheDocument(),
    )
    expect(fetch).not.toHaveBeenCalled()
  })
  it('só oferece criar condomínio a quem é administrador', () => {
    useAccount.mockReturnValue({
      account: buildUser({ role: 'MANAGER' }),
      isLoading: false,
      isGone: false,
    })
    useCondominiums.mockReturnValue({ page: pageOf([condominium]), isLoading: false, error: null })

    render(<CondominiumsPage />)

    expect(screen.queryByRole('button', { name: 'Novo condomínio' })).not.toBeInTheDocument()
  })
})
