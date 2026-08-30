import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UserFiltersDialog } from '@/components/user/filters-dialog'
import { setScreen } from '@/tests/support/match-media'
import type { UserFilters } from '@/shared/types'

const onApply = vi.fn()
const onOpenChange = vi.fn()

beforeEach(() => {
  onApply.mockReset()
  onOpenChange.mockReset()
  setScreen('desktop')
})

function renderDialog(filters: UserFilters = {}): void {
  render(
    <UserFiltersDialog
      isOpen
      onOpenChange={onOpenChange}
      filters={filters}
      onApply={onApply}
    />,
  )
}

async function apply(): Promise<void> {
  await userEvent.click(screen.getByRole('button', { name: 'Aplicar' }))
}

describe('UserFiltersDialog', () => {
  it('offers a filter for every column that can be filtered', () => {
    renderDialog()

    expect(screen.getByLabelText('Código')).toBeInTheDocument()
    expect(screen.getByLabelText('Nome')).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Síndico' })).toBeInTheDocument()
  })

  it('offers the three states a person can be in', () => {
    renderDialog()

    expect(screen.getByRole('radio', { name: 'Todos' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Ativos' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Inativos' })).toBeInTheDocument()
  })

  it('starts on all of them', () => {
    renderDialog()

    expect(screen.getByRole('radio', { name: 'Todos' })).toBeChecked()
  })

  it('applies the code, the name and the e-mail', async () => {
    renderDialog()

    await userEvent.type(screen.getByLabelText('Código'), 'abc-123')
    await userEvent.type(screen.getByLabelText('Nome'), 'Ana')
    await userEvent.type(screen.getByLabelText('E-mail'), 'ana@')
    await apply()

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'abc-123', name: 'Ana', email: 'ana@' }),
    )
  })

  it('applies the inactive-only filter', async () => {
    renderDialog()

    await userEvent.click(screen.getByRole('radio', { name: 'Inativos' }))
    await apply()

    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ status: 'inactive' }))
  })

  it('applies the manager filter', async () => {
    renderDialog()

    await userEvent.click(screen.getByRole('radio', { name: 'Síndico' }))
    await apply()

    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ role: 'MANAGER' }))
  })

  it('filtra por qualquer papel quando a escolha é Todos', async () => {
    renderDialog({ role: 'MANAGER' })

    await userEvent.click(screen.getByRole('radio', { name: 'Qualquer papel' }))
    await apply()

    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ role: undefined }))
  })

  it('leaves an empty text field out of the filters', async () => {
    renderDialog()

    await apply()

    expect(onApply).toHaveBeenCalledWith({ status: 'all' })
  })

  it('closes itself after applying', async () => {
    renderDialog()

    await apply()

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('clears the filters but keeps the search term', async () => {
    renderDialog({ search: 'ana', role: 'MANAGER' })

    await userEvent.click(screen.getByRole('button', { name: 'Limpar' }))

    expect(onApply).toHaveBeenCalledWith({ search: 'ana' })
  })

  it('clears to nothing when there was no search term', async () => {
    renderDialog({ role: 'MANAGER' })

    await userEvent.click(screen.getByRole('button', { name: 'Limpar' }))

    expect(onApply).toHaveBeenCalledWith({})
  })
})
