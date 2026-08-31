import { render, screen } from '@testing-library/react'
import { waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AppLayout from '@/app/(app)/layout'
import { buildUser } from '@/tests/support/build-user'
import { setScreen } from '@/tests/support/match-media'

const replace = vi.fn()
const useSession = vi.fn()
const useAccount = vi.fn()
const signOut = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/users',
}))
vi.mock('next-auth/react', () => ({
  useSession: () => useSession(),
  signOut: (...args: unknown[]) => signOut(...args),
}))
vi.mock('@/hooks/use-account', () => ({ useAccount: () => useAccount() }))

beforeEach(() => {
  setScreen('desktop')
  replace.mockReset()
  useSession.mockReturnValue({ status: 'authenticated' })
  signOut.mockReset()
  // whoever uses the panel is a manager; a resident belongs in the portal
  useAccount.mockReturnValue({
    account: buildUser({ role: 'MANAGER' }),
    isLoading: false,
    isGone: false,
  })
})

function renderLayout(): ReturnType<typeof render> {
  return render(
    <AppLayout>
      <p>conteúdo da tela</p>
    </AppLayout>,
  )
}

describe('AppLayout', () => {
  it('shows the screen it wraps', () => {
    renderLayout()

    expect(screen.getByText('conteúdo da tela')).toBeInTheDocument()
  })

  it('closes the rail from the button on the top left', async () => {
    renderLayout()

    await userEvent.click(screen.getByRole('button', { name: 'Fechar o menu lateral' }))

    expect(screen.getByTestId('nav-desktop').parentElement).toHaveAttribute('inert')
  })

  it('opens the rail again', async () => {
    renderLayout()

    await userEvent.click(screen.getByRole('button', { name: 'Fechar o menu lateral' }))
    await userEvent.click(screen.getByRole('button', { name: 'Abrir o menu lateral' }))

    expect(screen.getByTestId('nav-desktop').parentElement).not.toHaveAttribute('inert')
  })

  it('offers the light and dark switch on the desktop header too', () => {
    renderLayout()

    expect(screen.getAllByRole('button', { name: /Usar o modo/ }).length).toBeGreaterThan(1)
  })

  it('shows the admin navigation', () => {
    renderLayout()

    // rail and pill both render; CSS shows one
    expect(screen.getAllByRole('navigation', { name: /administrativo/i }).length).toBe(2)
  })

  it('sends a signed-out visitor to the sign-in screen', () => {
    useSession.mockReturnValue({ status: 'unauthenticated' })
    useAccount.mockReturnValue({ account: null, isLoading: false, isGone: false })

    renderLayout()

    expect(replace).toHaveBeenCalledWith('/signin')
  })

  it('shows nothing while the account is loading', () => {
    useAccount.mockReturnValue({ account: null, isLoading: true, isGone: false })

    renderLayout()

    expect(screen.queryByText('conteúdo da tela')).not.toBeInTheDocument()
  })

  it('holds the screen back until the first password is replaced', async () => {
    useAccount.mockReturnValue({
      account: buildUser({ role: 'MANAGER', mustChangePassword: true, username: 'ana' }),
      isLoading: false,
      isGone: false,
    })

    renderLayout()

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/change-password'))
    expect(screen.queryByText('conteúdo da tela')).not.toBeInTheDocument()
  })
  it('never asks for a password from someone who signs in with Google', async () => {
    useAccount.mockReturnValue({
      account: buildUser({ role: 'MANAGER', mustChangePassword: true, username: null }),
      isLoading: false,
      isGone: false,
    })

    renderLayout()

    await waitFor(() => expect(screen.getByText('conteúdo da tela')).toBeInTheDocument())
    expect(replace).not.toHaveBeenCalledWith('/change-password')
  })

  it('signs out a session whose person no longer exists, instead of a blank screen', async () => {
    useAccount.mockReturnValue({ account: null, isLoading: false, isGone: true })

    renderLayout()

    await waitFor(() => expect(signOut).toHaveBeenCalledWith({ callbackUrl: '/signin' }))
  })
  it('desenha o painel para o morador, com o menu reduzido', () => {
    useAccount.mockReturnValue({
      account: buildUser({ role: 'RESIDENT' }),
      isLoading: false,
      isGone: false,
    })

    renderLayout()

    expect(screen.getByText('conteúdo da tela')).toBeInTheDocument()
    expect(screen.queryAllByRole('link', { name: 'Usuários' })).toHaveLength(0)
  })

  it('tira o morador de uma tela administrativa', async () => {
    useAccount.mockReturnValue({
      account: buildUser({ role: 'RESIDENT' }),
      isLoading: false,
      isGone: false,
    })

    renderLayout()

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/portal'))
  })


  it('avisa, em qualquer tela, quando alguém está impersonando', () => {
    useSession.mockReturnValue({
      status: 'authenticated',
      data: { user: { id: 'x', isImpersonated: true } },
    })

    renderLayout()

    expect(screen.getByRole('alert')).toHaveTextContent(/Vendo como/i)
  })
})
