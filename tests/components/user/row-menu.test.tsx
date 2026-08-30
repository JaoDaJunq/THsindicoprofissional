import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UserRowMenu } from '@/components/user/row-menu'
import type { User } from '@/shared/types'
import { buildUser } from '@/tests/support/build-user'

const user: User = buildUser()

const onClose = vi.fn()
const onView = vi.fn()
const onEdit = vi.fn()
const onDelete = vi.fn()

beforeEach(() => {
  onClose.mockReset()
  onView.mockReset()
  onEdit.mockReset()
  onDelete.mockReset()
})

function renderMenu(person: User | null = user): void {
  render(
    <UserRowMenu
      target={person && { user: person, x: 10, y: 20 }}
      onClose={onClose}
      onView={onView}
      onEdit={onEdit}
      onDelete={onDelete}
    />,
  )
}

describe('UserRowMenu', () => {
  it('stays out of the way while no row was asked for', () => {
    renderMenu(null)

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('offers viewing, editing and deleting', () => {
    renderMenu()

    expect(screen.getByRole('menuitem', { name: /Visualizar/ })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /Editar/ })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /Excluir/ })).toBeInTheDocument()
  })

  it('gives every option an icon', () => {
    renderMenu()

    for (const item of screen.getAllByRole('menuitem')) {
      expect(item.querySelector('svg')).not.toBeNull()
    }
  })

  it('asks to view the person', async () => {
    renderMenu()
    await userEvent.click(screen.getByRole('menuitem', { name: /Visualizar/ }))

    expect(onView).toHaveBeenCalledWith(user)
  })

  it('asks to edit the person', async () => {
    renderMenu()
    await userEvent.click(screen.getByRole('menuitem', { name: /Editar/ }))

    expect(onEdit).toHaveBeenCalledWith(user)
  })

  it('asks to delete the person', async () => {
    renderMenu()
    await userEvent.click(screen.getByRole('menuitem', { name: /Excluir/ }))

    expect(onDelete).toHaveBeenCalledWith(user)
  })

  it('closes itself once an option was chosen', async () => {
    renderMenu()
    await userEvent.click(screen.getByRole('menuitem', { name: /Editar/ }))

    expect(onClose).toHaveBeenCalled()
  })
})
