import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DeactivateCondominiumDialog } from '@/components/condominium/deactivate-dialog'
import { setScreen } from '@/tests/support/match-media'
import { buildCondominium } from '@/tests/support/build-condominium'

const onOpenChange = vi.fn()
const onDeleted = vi.fn()
const condominium = buildCondominium()

beforeEach(() => {
  onOpenChange.mockReset()
  onDeleted.mockReset()
  setScreen('desktop')
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
})

describe('DeactivateCondominiumDialog', () => {
  it('stays out of the way while no condominium was chosen', () => {
    render(
      <DeactivateCondominiumDialog
        condominium={null}
        onOpenChange={onOpenChange}
        onDeleted={onDeleted}
      />,
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('names the condominium it is about to deactivate', () => {
    render(
      <DeactivateCondominiumDialog
        condominium={condominium}
        onOpenChange={onOpenChange}
        onDeleted={onDeleted}
      />,
    )

    expect(screen.getByText(condominium.name)).toBeInTheDocument()
  })

  it('deactivates through the API of that condominium', async () => {
    render(
      <DeactivateCondominiumDialog
        condominium={condominium}
        onOpenChange={onOpenChange}
        onDeleted={onDeleted}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Desativar' }))

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(`/api/condominiums/${condominium.id}`, {
        method: 'DELETE',
      }),
    )
    expect(onDeleted).toHaveBeenCalled()
  })
})
