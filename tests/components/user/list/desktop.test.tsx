import { fireEvent, render, screen } from '@testing-library/react'
import { UserListDesktop } from '@/components/user/list/desktop'
import type { User } from '@/shared/types'
import { buildUser } from '@/tests/support/build-user'

const base: User = buildUser()

const noop = (): void => undefined

function renderTable(users: User[], firstIndex = 0): void {
  render(
    <UserListDesktop users={users} firstIndex={firstIndex} onEdit={noop} onDeactivate={noop} onActivate={noop} />,
  )
}

describe('UserListDesktop', () => {
  it('numbers the rows continuing from the current page', () => {
    renderTable([base], 20)

    expect(screen.getByText('21')).toBeInTheDocument()
  })

  it('shows name and e-mail', () => {
    renderTable([base])

    expect(screen.getByText('Ana Souza')).toBeInTheDocument()
    expect(screen.getByText('ana@example.com')).toBeInTheDocument()
  })

  it('falls back to a dash when the person has no name', () => {
    renderTable([{ ...base, name: null }])

    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('mostra o papel da pessoa', () => {
    renderTable([{ ...base, role: 'MANAGER' }])

    expect(screen.getByText('Síndico')).toBeInTheDocument()
  })

  it('shows the status as a label', () => {
    renderTable([{ ...base, deletedAt: new Date('2026-02-01') }])

    expect(screen.getByText('Inativo')).toBeInTheDocument()
  })

  it('leaves no actions column taking up room', () => {
    renderTable([base])

    expect(screen.queryByRole('columnheader', { name: 'Ações' })).not.toBeInTheDocument()
  })

  it('opens the row actions with the right mouse button', async () => {
    renderTable([base])

    fireEvent.contextMenu(screen.getByText('Ana Souza').closest('tr') as HTMLElement)

    expect(await screen.findByRole('menuitem', { name: /Editar/ })).toBeInTheDocument()
  })
  it('renders the row normally when the person has a photo', () => {
    renderTable([{ ...base, image: 'https://example.com/ana.png' }])

    expect(screen.getByText('Ana Souza')).toBeInTheDocument()
    expect(screen.getByLabelText('Foto de Ana Souza')).toBeInTheDocument()
  })
})
