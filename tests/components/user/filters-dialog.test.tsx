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

describe('UserFiltersDialog', () => {
  it('offers a filter for every column that can be filtered', () => {
    renderDialog()

    expect(screen.getByText('Apenas síndicos')).toBeInTheDocument()
    expect(screen.getByText('Apenas inativos')).toBeInTheDocument()
  })

  it('applies the chosen filters', async () => {
    renderDialog()

    await userEvent.click(screen.getByRole('switch', { name: 'Apenas síndicos' }))
    await userEvent.click(screen.getByRole('button', { name: 'Aplicar' }))

    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ isManager: true }))
  })

  it('closes itself after applying', async () => {
    renderDialog()

    await userEvent.click(screen.getByRole('button', { name: 'Aplicar' }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('clears the filters but keeps the search term', async () => {
    renderDialog({ search: 'ana', isManager: true })

    await userEvent.click(screen.getByRole('button', { name: 'Limpar' }))

    expect(onApply).toHaveBeenCalledWith({ search: 'ana' })
  })

  it('clears to nothing when there was no search term', async () => {
    renderDialog({ isManager: true })

    await userEvent.click(screen.getByRole('button', { name: 'Limpar' }))

    expect(onApply).toHaveBeenCalledWith({})
  })
  it('applies the inactive-only filter', async () => {
    renderDialog()

    await userEvent.click(screen.getByRole('switch', { name: 'Apenas inativos' }))
    await userEvent.click(screen.getByRole('button', { name: 'Aplicar' }))

    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ isActive: false }))
  })

  it('unchecking a filter removes it instead of sending false', async () => {
    renderDialog({ isManager: true })

    await userEvent.click(screen.getByRole('switch', { name: 'Apenas síndicos' }))
    await userEvent.click(screen.getByRole('button', { name: 'Aplicar' }))

    expect(onApply).toHaveBeenCalledWith({ isManager: undefined })
  })
  it('unchecking the inactive filter removes it', async () => {
    renderDialog({ isActive: false })

    await userEvent.click(screen.getByRole('switch', { name: 'Apenas inativos' }))
    await userEvent.click(screen.getByRole('button', { name: 'Aplicar' }))

    expect(onApply).toHaveBeenCalledWith({ isActive: undefined })
  })
})
