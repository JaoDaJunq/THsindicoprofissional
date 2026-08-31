import { render, screen } from '@testing-library/react'
import { UserList } from '@/components/user/list'
import { buildUser } from '@/tests/support/build-user'

const noop = (): void => undefined

function renderList(): HTMLElement {
  const { container } = render(
    <UserList
      users={[buildUser()]}
      firstIndex={0}
      onDeactivate={noop}
      onEdit={noop}
      onActivate={noop}
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

  it('does not wrap the list in a rounded frame of its own', () => {
    const container = renderList()

    // Table and Accordion already draw a 32px-radius card; a tighter frame
    // around them clips their corners.
    expect(container.firstElementChild?.className ?? '').not.toMatch(
      /rounded|overflow-hidden|border/,
    )
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
