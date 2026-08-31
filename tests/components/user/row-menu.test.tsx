import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UserRowMenu } from '@/components/user/row-menu'
import type { User } from '@/shared/types'
import { buildUser } from '@/tests/support/build-user'

const user: User = buildUser()

const onClose = vi.fn()
const onEdit = vi.fn()
const onDeactivate = vi.fn()
const onActivate = vi.fn()
const onImpersonate = vi.fn()

beforeEach(() => {
  onClose.mockReset()
  onEdit.mockReset()
  onDeactivate.mockReset()
  onActivate.mockReset()
  onImpersonate.mockReset()
})

function renderMenu(person: User | null = user): void {
  render(
    <UserRowMenu
      target={person && { user: person, x: 10, y: 20 }}
      onClose={onClose}
      onEdit={onEdit}
      onDeactivate={onDeactivate}
      onActivate={onActivate}
    />,
  )
}

describe('UserRowMenu', () => {
  it('stays out of the way while no row was asked for', () => {
    renderMenu(null)

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('offers editing and deactivating', () => {
    renderMenu()

    expect(screen.getByRole('menuitem', { name: /Editar/ })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /Desativar/ })).toBeInTheDocument()
  })

  it('does not offer viewing, which no screen answers yet', () => {
    renderMenu()

    expect(screen.queryByRole('menuitem', { name: /Visualizar/ })).not.toBeInTheDocument()
  })

  it('offers to bring an inactive person back', () => {
    renderMenu(buildUser({ deletedAt: new Date('2026-02-01') }))

    expect(screen.getByRole('menuitem', { name: /Ativar/ })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: /Desativar/ })).not.toBeInTheDocument()
  })

  it('asks to bring the person back', async () => {
    const person = buildUser({ deletedAt: new Date('2026-02-01') })
    renderMenu(person)

    await userEvent.click(screen.getByRole('menuitem', { name: /Ativar/ }))

    expect(onActivate).toHaveBeenCalledWith(person)
  })

  it('gives every option an icon', () => {
    renderMenu()

    for (const item of screen.getAllByRole('menuitem')) {
      expect(item.querySelector('svg')).not.toBeNull()
    }
  })

  it('asks to edit the person', async () => {
    renderMenu()
    await userEvent.click(screen.getByRole('menuitem', { name: /Editar/ }))

    expect(onEdit).toHaveBeenCalledWith(user)
  })

  it('asks to deactivate the person', async () => {
    renderMenu()
    await userEvent.click(screen.getByRole('menuitem', { name: /Desativar/ }))

    expect(onDeactivate).toHaveBeenCalledWith(user)
  })

  it('closes itself once an option was chosen', async () => {
    renderMenu()
    await userEvent.click(screen.getByRole('menuitem', { name: /Editar/ }))

    expect(onClose).toHaveBeenCalled()
  })
  it('oferece impersonar quando quem olha pode fazer isso', async () => {
    render(
      <UserRowMenu
        target={{ user, x: 10, y: 20 }}
        onClose={onClose}
        onEdit={onEdit}
        onDeactivate={onDeactivate}
        onActivate={onActivate}
        onImpersonate={onImpersonate}
      />,
    )

    await userEvent.click(await screen.findByRole('menuitem', { name: /Ver como/ }))

    expect(onImpersonate).toHaveBeenCalledWith(user)
  })

  it('não oferece impersonar quando ninguém passou a ação', () => {
    renderMenu()

    expect(screen.queryByRole('menuitem', { name: /Ver como/ })).not.toBeInTheDocument()
  })
})
