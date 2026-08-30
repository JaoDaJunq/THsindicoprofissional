import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CondominiumFiltersDialog } from '@/components/condominium/filters-dialog'
import { setScreen } from '@/tests/support/match-media'
import type { CondominiumFilters } from '@/shared/types'

const onApply = vi.fn()
const onOpenChange = vi.fn()

beforeEach(() => {
  onApply.mockReset()
  onOpenChange.mockReset()
  setScreen('desktop')
})

function renderDialog(filters: CondominiumFilters = {}): void {
  render(
    <CondominiumFiltersDialog
      isOpen
      onOpenChange={onOpenChange}
      filters={filters}
      onApply={onApply}
    />,
  )
}

describe('CondominiumFiltersDialog', () => {
  it('offers a filter for every column that can be filtered', () => {
    renderDialog()

    expect(screen.getByLabelText('Nome')).toBeInTheDocument()
    expect(screen.getByLabelText('CNPJ')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
  })

  it('applies what was typed', async () => {
    renderDialog()

    await userEvent.type(screen.getByLabelText('Nome'), 'Aurora')
    await userEvent.click(screen.getByRole('button', { name: 'Aplicar' }))

    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ name: 'Aurora' }))
  })

  it('keeps the search term when clearing the other filters', async () => {
    renderDialog({ search: 'aurora', name: 'Aurora' })

    await userEvent.click(screen.getByRole('button', { name: 'Limpar' }))

    expect(onApply).toHaveBeenCalledWith({ search: 'aurora' })
  })

  it('applies the cnpj that was typed', async () => {
    renderDialog()

    await userEvent.type(screen.getByLabelText('CNPJ'), '123')
    await userEvent.click(screen.getByRole('button', { name: 'Aplicar' }))

    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ cnpj: '123' }))
  })

  it('applies the chosen status', async () => {
    renderDialog()

    await userEvent.click(screen.getByRole('radio', { name: 'Inativos' }))
    await userEvent.click(screen.getByRole('button', { name: 'Aplicar' }))

    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ status: 'inactive' }))
  })

  it('closes itself after applying', async () => {
    renderDialog()

    await userEvent.click(screen.getByRole('button', { name: 'Aplicar' }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('starts from the filters that are already applied', () => {
    renderDialog({ name: 'Aurora', cnpj: '123', status: 'inactive' })

    expect(screen.getByLabelText('Nome')).toHaveValue('Aurora')
    expect(screen.getByLabelText('CNPJ')).toHaveValue('123')
    expect(screen.getByRole('radio', { name: 'Inativos' })).toBeChecked()
  })
})
