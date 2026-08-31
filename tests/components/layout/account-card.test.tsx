import { render, screen } from '@testing-library/react'
import { AccountCard } from '@/components/layout/account/card'
import { initialsOf } from '@/components/user-avatar'
import { buildUser } from '@/tests/support/build-user'

vi.mock('next-auth/react', () => ({ signOut: vi.fn() }))

describe('initialsOf', () => {
  it('takes the first letter of the first two names', () => {
    expect(initialsOf(buildUser({ name: 'Ana Paula Souza' }))).toBe('AP')
  })

  it('handles a single name', () => {
    expect(initialsOf(buildUser({ name: 'Ana' }))).toBe('A')
  })

  it('falls back to the e-mail when there is no name', () => {
    expect(initialsOf(buildUser({ name: null, email: 'zeca@example.com' }))).toBe('Z')
  })

  it('ignores extra spaces instead of producing blanks', () => {
    expect(initialsOf(buildUser({ name: '  Ana   Souza ' }))).toBe('AS')
  })
})

describe('AccountCard', () => {
  it('shows name and e-mail', () => {
    render(<AccountCard account={buildUser({ name: 'Ana Souza' })} />)

    expect(screen.getByText('Ana Souza')).toBeInTheDocument()
    expect(screen.getByText('ana@example.com')).toBeInTheDocument()
  })

  it('says when the person is a building manager', () => {
    render(<AccountCard account={buildUser({ role: 'MANAGER' })} />)

    expect(screen.getByText('Síndico')).toBeInTheDocument()
  })

  it('names the system administrator', () => {
    render(<AccountCard account={buildUser({ role: 'ADMIN' })} />)

    expect(screen.getByText('Administrador')).toBeInTheDocument()
  })

  it('names the resident', () => {
    render(<AccountCard account={buildUser({ role: 'RESIDENT' })} />)

    expect(screen.getByText('Morador')).toBeInTheDocument()
  })

  it('shows the photo when there is one', () => {
    const { container } = render(
      <AccountCard account={buildUser({ image: 'https://example.com/ana.png' })} />,
    )

    expect(container.querySelector('[aria-label^="Foto de"]')).toBeInTheDocument()
  })
  it('chama pelo e-mail quem ainda não tem nome', () => {
    render(<AccountCard account={buildUser({ name: null })} />)

    // o e-mail aparece duas vezes: como nome e como e-mail
    expect(screen.getAllByText('ana@example.com')).toHaveLength(2)
  })
})
