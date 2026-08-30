import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UserRowMenu } from '@/components/user/row-menu'
import type { User } from '@/shared/types'
import { buildUser } from '@/tests/support/build-user'

const user: User = buildUser()

const onView = vi.fn()
const onEdit = vi.fn()
const onDelete = vi.fn()

beforeEach(() => {
  onView.mockReset()
  onEdit.mockReset()
  onDelete.mockReset()
})

async function openMenu(person: User = user): Promise<void> {
  render(<UserRowMenu user={person} onView={onView} onEdit={onEdit} onDelete={onDelete} />)
  await userEvent.click(screen.getByRole('button', { name: `Ações de ${person.name}` }))
}

describe('UserRowMenu', () => {
  it('names the trigger after the person, so screen readers can tell rows apart', () => {
    render(<UserRowMenu user={user} onView={onView} onEdit={onEdit} onDelete={onDelete} />)

    expect(screen.getByRole('button', { name: 'Ações de Ana Souza' })).toBeInTheDocument()
  })

  it('falls back to the e-mail when the person has no name', () => {
    const nameless = { ...user, name: null }
    render(<UserRowMenu user={nameless} onView={onView} onEdit={onEdit} onDelete={onDelete} />)

    expect(screen.getByRole('button', { name: 'Ações de ana@example.com' })).toBeInTheDocument()
  })

  it('offers viewing, editing and deleting', async () => {
    await openMenu()

    expect(screen.getByRole('menuitem', { name: 'Visualizar' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Editar' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Excluir' })).toBeInTheDocument()
  })

  it('asks to view the person', async () => {
    await openMenu()
    await userEvent.click(screen.getByRole('menuitem', { name: 'Visualizar' }))

    expect(onView).toHaveBeenCalledWith(user)
  })

  it('asks to edit the person', async () => {
    await openMenu()
    await userEvent.click(screen.getByRole('menuitem', { name: 'Editar' }))

    expect(onEdit).toHaveBeenCalledWith(user)
  })

  it('asks to delete the person', async () => {
    await openMenu()
    await userEvent.click(screen.getByRole('menuitem', { name: 'Excluir' }))

    expect(onDelete).toHaveBeenCalledWith(user)
  })
})
