import { render, screen } from '@testing-library/react'
import { waitFor } from '@testing-library/react'
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
  useAccount.mockReturnValue({ account: buildUser(), isLoading: false, isGone: false })
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
      account: buildUser({ mustChangePassword: true }),
      isLoading: false,
      isGone: false,
    })

    renderLayout()

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/change-password'))
    expect(screen.queryByText('conteúdo da tela')).not.toBeInTheDocument()
  })
  it('signs out a session whose person no longer exists, instead of a blank screen', async () => {
    useAccount.mockReturnValue({ account: null, isLoading: false, isGone: true })

    renderLayout()

    await waitFor(() => expect(signOut).toHaveBeenCalledWith({ callbackUrl: '/signin' }))
  })
})
