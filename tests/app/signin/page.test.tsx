import { render, screen } from '@testing-library/react'
import SignInPage from '@/app/signin/page'

const searchParams = new URLSearchParams()

vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParams,
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}))
vi.mock('next-auth/react', () => ({ signIn: vi.fn() }))

function renderWith(error?: string): void {
  searchParams.delete('error')
  if (error) searchParams.set('error', error)
  render(<SignInPage />)
}

describe('SignInPage', () => {
  it('offers signing in with Google', () => {
    renderWith()

    expect(screen.getByRole('button', { name: 'Entrar com Google' })).toBeInTheDocument()
  })

  it('shows no warning on a first visit', () => {
    renderWith()

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('explains an e-mail already linked to another sign-in method', () => {
    renderWith('OAuthAccountNotLinked')

    expect(screen.getByRole('alert')).toHaveTextContent(/já está vinculado/i)
  })

  it('explains a denied consent', () => {
    renderWith('AccessDenied')

    expect(screen.getByRole('alert')).toHaveTextContent(/acesso negado/i)
  })

  it('falls back to a generic warning for an unknown error', () => {
    renderWith('SomethingWeird')

    expect(screen.getByRole('alert')).toHaveTextContent(/não foi possível entrar/i)
  })
  it('offers signing in with a username and password too', () => {
    renderWith()

    expect(screen.getByLabelText('Usuário')).toBeInTheDocument()
    expect(screen.getByLabelText('Senha')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument()
  })

  it('explains wrong credentials', () => {
    renderWith('CredentialsSignin')

    expect(screen.getByRole('alert')).toHaveTextContent(/usuário ou senha incorretos/i)
  })
})
