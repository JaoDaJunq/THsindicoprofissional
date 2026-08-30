import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CondominiumFormDialog } from '@/components/condominium/form-dialog'
import { setScreen } from '@/tests/support/match-media'
import { buildCondominium } from '@/tests/support/build-condominium'
import { buildUser } from '@/tests/support/build-user'
import type { Condominium } from '@/shared/types'

const onOpenChange = vi.fn()
const onSaved = vi.fn()

const useMemberships = vi.fn().mockReturnValue({ memberships: [], isLoading: false, error: null })
vi.mock('@/hooks/use-memberships', () => ({
  useMemberships: (...args: unknown[]) => useMemberships(...args),
}))

const useSearch = vi.fn().mockReturnValue({ results: [], isLoading: false })
vi.mock('@/hooks/use-search', () => ({ useSearch: (...args: unknown[]) => useSearch(...args) }))

beforeEach(() => {
  onOpenChange.mockReset()
  onSaved.mockReset()
  setScreen('desktop')
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }))
})

function renderDialog(condominium: Condominium | null = null): void {
  render(
    <CondominiumFormDialog
      isOpen
      condominium={condominium}
      onOpenChange={onOpenChange}
      onSaved={onSaved}
    />,
  )
}

async function save(): Promise<void> {
  await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
}

describe('CondominiumFormDialog', () => {
  it('asks for everything the condominium has', () => {
    renderDialog()

    expect(screen.getByLabelText('Nome')).toBeInTheDocument()
    expect(screen.getByLabelText('Endereço')).toBeInTheDocument()
    expect(screen.getByLabelText('CNPJ')).toBeInTheDocument()
    expect(screen.getByLabelText('Telefone')).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument()
    expect(screen.getByLabelText('Unidades')).toBeInTheDocument()
    expect(screen.getByLabelText('Blocos')).toBeInTheDocument()
  })

  it('does not ask for a resident count, which is counted from the links', () => {
    renderDialog()

    expect(screen.queryByLabelText('Moradores')).not.toBeInTheDocument()
  })

  it('creates the condominium that was typed', async () => {
    renderDialog()
    await userEvent.type(screen.getByLabelText('Nome'), 'Aurora')
    await userEvent.type(screen.getByLabelText('Endereço'), 'Rua A, 10')

    await save()

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        '/api/condominiums',
        expect.objectContaining({ method: 'POST' }),
      ),
    )
  })

  it('sends the counts as numbers, not as text', async () => {
    renderDialog()
    await userEvent.type(screen.getByLabelText('Nome'), 'Aurora')
    await userEvent.type(screen.getByLabelText('Endereço'), 'Rua A, 10')
    await userEvent.type(screen.getByLabelText('Unidades'), '40')

    await save()

    await waitFor(() => {
      const body = vi.mocked(fetch).mock.calls[0]?.[1]?.body
      expect(JSON.parse(String(body)).unitsCount).toBe(40)
    })
  })

  it('updates the condominium it was given instead of creating another', async () => {
    const condominium = buildCondominium()
    renderDialog(condominium)

    await save()

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        `/api/condominiums/${condominium.id}`,
        expect.objectContaining({ method: 'PATCH' }),
      ),
    )
  })

  it('starts from what the condominium already has', () => {
    renderDialog(buildCondominium())

    expect(screen.getByLabelText('Nome')).toHaveValue('Residencial Aurora')
  })

  it('refuses to send a condominium without a name', async () => {
    renderDialog()

    await save()

    expect(fetch).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(/nome/i)
  })

  it('says when the cnpj already belongs to another condominium', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 409 }))
    renderDialog()
    await userEvent.type(screen.getByLabelText('Nome'), 'Aurora')
    await userEvent.type(screen.getByLabelText('Endereço'), 'Rua A, 10')

    await save()

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/CNPJ/))
  })

  it('reports a failure instead of pretending it saved', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    renderDialog()
    await userEvent.type(screen.getByLabelText('Nome'), 'Aurora')
    await userEvent.type(screen.getByLabelText('Endereço'), 'Rua A, 10')

    await save()

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/não foi possível/i))
  })

  it('closes itself without saving when cancelled', async () => {
    renderDialog()

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(fetch).not.toHaveBeenCalled()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('refuses to send a condominium without an address', async () => {
    renderDialog()
    await userEvent.type(screen.getByLabelText('Nome'), 'Aurora')

    await save()

    expect(fetch).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(/endereço/i)
  })

  it('closes itself once the condominium was saved', async () => {
    renderDialog()
    await userEvent.type(screen.getByLabelText('Nome'), 'Aurora')
    await userEvent.type(screen.getByLabelText('Endereço'), 'Rua A, 10')

    await save()

    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('lets people be searched while editing a condominium', () => {
    renderDialog(buildCondominium())

    expect(screen.getByLabelText('Buscar pessoa')).toBeInTheDocument()
  })

  it('has nothing to link to while the condominium is not created yet', () => {
    renderDialog()

    expect(screen.queryByLabelText('Buscar pessoa')).not.toBeInTheDocument()
  })

  it('says when only a manager can save', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }))
    renderDialog()
    await userEvent.type(screen.getByLabelText('Nome'), 'Aurora')
    await userEvent.type(screen.getByLabelText('Endereço'), 'Rua A, 10')

    await save()

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/síndico/i))
  })

  it('offers whoever the search found', async () => {
    useSearch.mockReturnValue({
      results: [{ id: buildUser().id, label: 'Ana Souza' }],
      isLoading: false,
    })
    renderDialog(buildCondominium())

    await userEvent.type(screen.getByLabelText('Buscar pessoa'), 'ana')

    expect(await screen.findByRole('option', { name: 'Ana Souza' })).toBeInTheDocument()
  })
})
