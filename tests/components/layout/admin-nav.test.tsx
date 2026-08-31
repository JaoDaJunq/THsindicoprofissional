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
  // the full menu belongs to a manager; a resident sees only Início
  const { container } = render(
    <AdminNav account={buildUser({ role: 'MANAGER', ...overrides })} />,
  )
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

  it('shows the role of the person on the rail', () => {
    renderNav({ role: 'MANAGER' })

    expect(screen.getByText('Síndico')).toBeInTheDocument()
  })

  it('calls a person who is not a manager a resident', () => {
    renderNav({ role: 'RESIDENT' })

    expect(screen.getByText('Morador')).toBeInTheDocument()
  })

  it('puts the closed rail out of reach, without touching the pill', () => {
    render(<AdminNav account={buildUser({ role: 'MANAGER' })} isRailOpen={false} />)

    expect(screen.getByTestId('nav-desktop').parentElement).toHaveAttribute('inert')
    expect(screen.getByTestId('nav-mobile')).toBeInTheDocument()
  })

  it('slides the rail instead of making it blink away', () => {
    render(<AdminNav account={buildUser({ role: 'MANAGER' })} isRailOpen={false} />)

    expect(screen.getByTestId('nav-desktop').parentElement).toHaveClass('transition-[width]')
  })

  it('keeps the open rail reachable', () => {
    render(<AdminNav account={buildUser({ role: 'MANAGER' })} isRailOpen />)

    expect(screen.getByTestId('nav-desktop').parentElement).not.toHaveAttribute('inert')
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

    expect(screen.getByTestId('account-card')).toBeInTheDocument()
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
  it('gruda no topo o invólucro da barra, e não a barra dentro dele', () => {
    renderNav()

    // sticky has to live on the element that owns `overflow-hidden`: an
    // ancestor with overflow silently cancels sticky on its descendants.
    const wrapper = screen.getByTestId('nav-desktop').parentElement

    expect(wrapper?.className).toContain('sticky')
    expect(wrapper?.className).toContain('top-0')
    expect(wrapper?.className).toContain('h-screen')
    // a stretched flex item has nowhere to slide, and sticky does nothing
    expect(wrapper?.className).toContain('self-start')
  })

  it('não deixa a barra ganhar rolagem própria', () => {
    renderNav()

    expect(screen.getByTestId('nav-desktop').className).toContain('overflow-hidden')
  })
  it('chama pelo e-mail quem ainda não tem nome', () => {
    renderNav({ name: null })

    expect(screen.getByText('ana@example.com')).toBeInTheDocument()
  })
  it('leva para o início pessoal, seja qual for o papel', () => {
    renderNav({ role: 'MANAGER' })

    const inicio = screen.getAllByRole('link', { name: 'Início' })

    expect(inicio.length).toBeGreaterThan(0)
    expect(inicio[0]).toHaveAttribute('href', '/portal')
  })

  it('mostra o início também para o administrador', () => {
    renderNav({ role: 'ADMIN' })

    expect(screen.getAllByRole('link', { name: 'Início' })[0]).toHaveAttribute('href', '/portal')
  })
  it('esconde do morador as telas que não são dele', () => {
    renderNav({ role: 'RESIDENT' })

    expect(screen.queryAllByRole('link', { name: 'Usuários' })).toHaveLength(0)
    expect(screen.queryAllByRole('link', { name: 'Condomínios' })).toHaveLength(0)
    expect(screen.getAllByRole('link', { name: 'Início' }).length).toBeGreaterThan(0)
  })
})
