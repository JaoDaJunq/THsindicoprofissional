import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CondominiumListMobile } from '@/components/condominium/list/mobile'
import type { Condominium } from '@/shared/types'
import { buildCondominium } from '@/tests/support/build-condominium'

const base: Condominium = buildCondominium()

const onEdit = vi.fn()
const onDeactivate = vi.fn()
const onActivate = vi.fn()

beforeEach(() => {
  onEdit.mockReset()
  onDeactivate.mockReset()
  onActivate.mockReset()
})

function renderList(condominiums: Condominium[]): void {
  render(
    <CondominiumListMobile
      condominiums={condominiums}
      firstIndex={0}
      onEdit={onEdit}
      onDeactivate={onDeactivate}
      onActivate={onActivate}
    />,
  )
}

async function openPanel(): Promise<void> {
  await userEvent.click(screen.getByRole('button', { name: /Residencial Aurora/ }))
}

describe('CondominiumListMobile', () => {
  it('says when there is nothing to show', () => {
    renderList([])

    expect(screen.getByText('Nenhum condomínio encontrado.')).toBeInTheDocument()
  })

  it('shows the address inside the panel', async () => {
    renderList([base])

    await openPanel()

    expect(screen.getByText(base.address)).toBeInTheDocument()
  })

  it('offers deactivating while the condominium is active', async () => {
    renderList([base])
    await openPanel()

    await userEvent.click(screen.getByRole('button', { name: 'Desativar' }))

    expect(onDeactivate).toHaveBeenCalledWith(base)
  })

  it('offers activating once the condominium was excluded', async () => {
    const excluded = { ...base, deletedAt: new Date('2026-02-01') }
    renderList([excluded])
    await openPanel()

    await userEvent.click(screen.getByRole('button', { name: 'Ativar' }))

    expect(onActivate).toHaveBeenCalledWith(excluded)
  })

  it('opens the edit screen', async () => {
    renderList([base])
    await openPanel()

    await userEvent.click(screen.getByRole('button', { name: 'Editar' }))

    expect(onEdit).toHaveBeenCalledWith(base)
  })
})
