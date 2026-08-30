import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdminNav } from '@/components/layout/admin-nav'
import { buildUser } from '@/tests/support/build-user'

const signOut = vi.fn()
const pathname = vi.fn()

vi.mock('next-auth/react', () => ({ signOut: (...args: unknown[]) => signOut(...args) }))
vi.mock('next/navigation', () => ({ usePathname: () => pathname() }))

beforeEach(() => {
  signOut.mockReset()
  pathname.mockReturnValue('/users')
})

function renderNav(overrides = {}): HTMLElement {
  const { container } = render(<AdminNav account={buildUser(overrides)} />)
  return container
}

describe('AdminNav', () => {
  it('renders both shapes so CSS can pick one', () => {
    renderNav()

    expect(screen.getByTestId('nav-desktop')).toBeInTheDocument()
    expect(screen.getByTestId('nav-mobile')).toBeInTheDocument()
  })

  it('hides the rail on phone widths', () => {
    const container = renderNav()

    expect(container.querySelector('.hidden.md\\:block')).toBeInTheDocument()
  })

  it('hides the pill from tablet widths up', () => {
    const container = renderNav()

    expect(container.querySelector('.md\\:hidden')).toBeInTheDocument()
  })

  it('links to the users screen', () => {
    renderNav()

    const links = screen.getAllByRole('link', { name: 'Usuários' })
    expect(links[0]).toHaveAttribute('href', '/users')
  })

  it('marks the screen the person is on', () => {
    renderNav()

    expect(screen.getAllByRole('link', { name: 'Usuários' })[0]).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('does not mark a screen the person is not on', () => {
    pathname.mockReturnValue('/change-password')
    renderNav()

    expect(screen.getAllByRole('link', { name: 'Usuários' })[0]).not.toHaveAttribute(
      'aria-current',
    )
  })

  it('shows who is signed in on the rail', () => {
    renderNav({ name: 'Ana Souza' })

    expect(screen.getByText('Ana Souza')).toBeInTheDocument()
  })

  it('signs the person out and sends them to the sign-in screen', async () => {
    renderNav()

    await userEvent.click(screen.getByRole('button', { name: 'Sair' }))

    expect(signOut).toHaveBeenCalledWith({ callbackUrl: '/signin' })
  })

  it('opens the menu drawer from the pill', async () => {
    renderNav()

    await userEvent.click(screen.getByRole('button', { name: 'Abrir o menu' }))

    expect(screen.getByText('Menu')).toBeInTheDocument()
  })

  it('opens the account from the pill', async () => {
    renderNav()

    await userEvent.click(screen.getByRole('button', { name: 'Abrir a conta' }))

    expect(screen.getAllByTestId('account-card').length).toBeGreaterThan(1)
  })
  it('closes the menu drawer after choosing a screen', async () => {
    renderNav()
    await userEvent.click(screen.getByRole('button', { name: 'Abrir o menu' }))

    const inDrawer = screen.getAllByRole('link', { name: 'Usuários' })
    await userEvent.click(inDrawer[inDrawer.length - 1] as HTMLElement)

    expect(screen.queryByText('Menu')).not.toBeInTheDocument()
  })

  it('shows the photo in the pill when the person has one', async () => {
    renderNav({ image: 'https://example.com/ana.png' })

    expect(screen.getByRole('button', { name: 'Abrir a conta' })).toBeInTheDocument()
  })
})
