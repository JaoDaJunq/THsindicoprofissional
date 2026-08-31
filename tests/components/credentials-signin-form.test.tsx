import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CredentialsSignInForm } from '@/components/credentials-signin-form'

const signIn = vi.fn()
const replace = vi.fn()

vi.mock('next-auth/react', () => ({ signIn: (...args: unknown[]) => signIn(...args) }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, refresh: vi.fn() }),
}))

beforeEach(() => {
  signIn.mockReset().mockResolvedValue({ error: null })
  replace.mockReset()
})

async function fillAndSubmit(user = 'admin', password = 'admin'): Promise<void> {
  render(<CredentialsSignInForm />)
  await userEvent.type(screen.getByLabelText('Usuário'), user)
  await userEvent.type(screen.getByLabelText('Senha'), password)
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
}

describe('CredentialsSignInForm', () => {
  it('sends what was typed to the credentials provider', async () => {
    await fillAndSubmit()

    expect(signIn).toHaveBeenCalledWith('credentials', {
      username: 'admin',
      password: 'admin',
      redirect: false,
    })
  })

  it('hands the routing decision to the home page after signing in', async () => {
    await fillAndSubmit()

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'))
  })

  it('reports wrong credentials without saying which field was wrong', async () => {
    signIn.mockResolvedValue({ error: 'CredentialsSignin' })

    await fillAndSubmit()

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Usuário ou senha incorretos.'),
    )
    expect(replace).not.toHaveBeenCalled()
  })

  it('masks the password field', async () => {
    render(<CredentialsSignInForm />)

    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'password')
  })
})
