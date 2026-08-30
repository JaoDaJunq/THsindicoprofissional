import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DeleteUserDialog } from '@/components/user/delete-dialog'
import { setScreen } from '@/tests/support/match-media'
import type { User } from '@/shared/types'
import { buildUser } from '@/tests/support/build-user'

const user: User = buildUser()

const onOpenChange = vi.fn()
const onDeleted = vi.fn()

beforeEach(() => {
  onOpenChange.mockReset()
  onDeleted.mockReset()
  setScreen('desktop')
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
})

function renderDialog(person: User | null = user): void {
  render(<DeleteUserDialog user={person} onOpenChange={onOpenChange} onDeleted={onDeleted} />)
}

describe('DeleteUserDialog', () => {
  it('explains that nobody deletes their own account', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({ error: 'cannot-delete-self' }) }),
    )
    renderDialog()

    await userEvent.click(screen.getByRole('button', { name: 'Excluir' }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/própria conta/i),
    )
  })

  it('shows nothing when no one is selected', () => {
    renderDialog(null)

    expect(screen.queryByText('Excluir usuário')).not.toBeInTheDocument()
  })

  it('names the person about to be excluded', () => {
    renderDialog()

    expect(screen.getByText('Ana Souza')).toBeInTheDocument()
  })

  it('explains that the history is kept, since this is a soft delete', () => {
    renderDialog()

    expect(screen.getByText(/histórico dela é preservado/i)).toBeInTheDocument()
  })

  it('asks the API to delete the person', async () => {
    renderDialog()

    await userEvent.click(screen.getByRole('button', { name: 'Excluir' }))

    expect(fetch).toHaveBeenCalledWith(`/api/users/${user.id}`, { method: 'DELETE' })
  })

  it('tells the screen to reload after deleting', async () => {
    renderDialog()

    await userEvent.click(screen.getByRole('button', { name: 'Excluir' }))

    await waitFor(() => expect(onDeleted).toHaveBeenCalled())
  })

  it('closes on cancel without deleting anything', async () => {
    renderDialog()

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(fetch).not.toHaveBeenCalled()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('reports a failure instead of pretending it worked', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    renderDialog()

    await userEvent.click(screen.getByRole('button', { name: 'Excluir' }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/não foi possível excluir/i),
    )
    expect(onDeleted).not.toHaveBeenCalled()
  })
  it('falls back to the e-mail when the person has no name', () => {
    renderDialog({ ...user, name: null })

    expect(screen.getByText('ana@example.com')).toBeInTheDocument()
  })
})
