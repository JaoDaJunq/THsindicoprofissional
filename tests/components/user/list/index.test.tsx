import { render, screen } from '@testing-library/react'
import { UserList } from '@/components/user/list'
import { buildUser } from '@/tests/support/build-user'

const noop = (): void => undefined

function renderList(): HTMLElement {
  const { container } = render(
    <UserList
      users={[buildUser()]}
      firstIndex={0}
      onView={noop}
      onEdit={noop}
      onDelete={noop}
    />,
  )
  return container
}

describe('UserList', () => {
  it('renders both shapes so CSS can pick one without waiting for JavaScript', () => {
    const container = renderList()

    expect(container.querySelector('table')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Ana Souza/ }).length).toBeGreaterThan(0)
  })

  it('hides the table on phone widths', () => {
    const container = renderList()

    expect(container.querySelector('.hidden.md\\:block')).toBeInTheDocument()
  })

  it('hides the accordion from tablet widths up', () => {
    const container = renderList()

    expect(container.querySelector('.md\\:hidden')).toBeInTheDocument()
  })
})
