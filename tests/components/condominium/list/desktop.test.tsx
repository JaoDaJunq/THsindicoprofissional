import { fireEvent, render, screen } from '@testing-library/react'
import { CondominiumListDesktop } from '@/components/condominium/list/desktop'
import type { Condominium } from '@/shared/types'
import { buildCondominium } from '@/tests/support/build-condominium'

const base: Condominium = buildCondominium()

const noop = (): void => undefined

function renderTable(condominiums: Condominium[], firstIndex = 0): void {
  render(
    <CondominiumListDesktop
      condominiums={condominiums}
      firstIndex={firstIndex}
      onEdit={noop}
      onDeactivate={noop}
      onActivate={noop}
    />,
  )
}

describe('CondominiumListDesktop', () => {
  it('numbers the rows continuing from the current page', () => {
    renderTable([base], 20)

    expect(screen.getByText('21')).toBeInTheDocument()
  })

  it('shows name and address', () => {
    renderTable([base])

    expect(screen.getByText('Residencial Aurora')).toBeInTheDocument()
    expect(screen.getByText(base.address)).toBeInTheDocument()
  })

  it('shows the cnpj already punctuated', () => {
    renderTable([base])

    expect(screen.getByText('12.345.678/0001-99')).toBeInTheDocument()
  })

  it('falls back to a dash when there is no cnpj', () => {
    renderTable([{ ...base, cnpj: null }])

    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('shows how many units the condominium has', () => {
    renderTable([{ ...base, unitsCount: 40 }])

    expect(screen.getByText('40')).toBeInTheDocument()
  })

  it('shows the status as a label', () => {
    renderTable([{ ...base, deletedAt: new Date('2026-02-01') }])

    expect(screen.getByText('Inativo')).toBeInTheDocument()
  })

  it('opens the row actions with the right mouse button', async () => {
    renderTable([base])

    fireEvent.contextMenu(screen.getByText('Residencial Aurora').closest('tr') as HTMLElement)

    expect(await screen.findByRole('menuitem', { name: /Editar/ })).toBeInTheDocument()
  })
})
