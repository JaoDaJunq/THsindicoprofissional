import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UserListMobile } from '@/components/user/list/mobile'
import { buildUser } from '@/tests/support/build-user'
import type { User } from '@/shared/types'

const onActivate = vi.fn()
const onEdit = vi.fn()
const onDeactivate = vi.fn()

beforeEach(() => {
  onActivate.mockReset()
  onEdit.mockReset()
  onDeactivate.mockReset()
})

function renderList(users: User[] = [buildUser()], firstIndex = 0): void {
  render(
    <UserListMobile
      users={users}
      firstIndex={firstIndex}
      onActivate={onActivate}
      onEdit={onEdit}
      onDeactivate={onDeactivate}
    />,
  )
}

async function expand(name = 'Ana Souza'): Promise<void> {
  await userEvent.click(screen.getByRole('button', { name: new RegExp(name) }))
}

describe('UserListMobile', () => {
  it('shows one collapsed row per person', () => {
    renderList([buildUser({ name: 'Ana Souza' })])

    expect(screen.getByRole('button', { name: /Ana Souza/ })).toBeInTheDocument()
  })

  it('keeps the details hidden until the row is opened', () => {
    renderList()

    // the accordion keeps the panel mounted; what matters is that nobody sees it
    expect(screen.getByText('ana@example.com')).not.toBeVisible()
  })

  it('reveals e-mail, profile and status when opened', async () => {
    renderList()

    await expand()

    expect(screen.getByText('ana@example.com')).toBeInTheDocument()
    expect(screen.getByText('Morador')).toBeInTheDocument()
    expect(screen.getByText('Ativo')).toBeInTheDocument()
  })

  it('calls the person a building manager when they are one', async () => {
    renderList([buildUser({ isManager: true })])

    await expand()

    expect(screen.getByText('Síndico')).toBeInTheDocument()
  })

  it('shows the row number continuing from the current page', async () => {
    renderList([buildUser()], 20)

    await expand()

    expect(screen.getByText('21')).toBeInTheDocument()
  })

  it('falls back to the e-mail as the heading when there is no name', () => {
    renderList([buildUser({ name: null })])

    expect(screen.getByRole('button', { name: /ana@example\.com/ })).toBeInTheDocument()
  })

  it('offers editing inside the opened row', async () => {
    renderList()
    await expand()

    await userEvent.click(screen.getByRole('button', { name: 'Editar' }))

    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ email: 'ana@example.com' }))
  })

  it('offers deactivating inside the opened row', async () => {
    renderList()
    await expand()

    await userEvent.click(screen.getByRole('button', { name: 'Desativar' }))

    expect(onDeactivate).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'ana@example.com' }),
    )
  })

  it('offers activating someone who is inactive', async () => {
    renderList([buildUser({ deletedAt: new Date('2026-02-01') })])
    await expand()

    await userEvent.click(screen.getByRole('button', { name: 'Ativar' }))

    expect(onActivate).toHaveBeenCalledWith(expect.objectContaining({ email: 'ana@example.com' }))
  })

  it('says when there is nobody to show', () => {
    renderList([])

    expect(screen.getByText('Nenhum usuário encontrado.')).toBeInTheDocument()
  })
})
