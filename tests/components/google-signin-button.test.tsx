import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GoogleSignInButton } from '@/components/google-signin-button'

const signIn = vi.fn()
vi.mock('next-auth/react', () => ({ signIn: (...args: unknown[]) => signIn(...args) }))

beforeEach(() => signIn.mockReset())

function button(): HTMLElement {
  render(<GoogleSignInButton />)
  return screen.getByRole('button', { name: 'Entrar com Google' })
}

describe('GoogleSignInButton', () => {
  it('uses the outlined style', () => {
    expect(button()).toHaveClass('button--outline')
  })

  it('shows the Google mark without polluting the accessible name', () => {
    const svg = button().querySelector('svg')

    expect(svg).toBeInTheDocument()
    expect(svg).toHaveAttribute('aria-hidden', 'true')
  })

  it('starts the Google flow when pressed', async () => {
    await userEvent.click(button())

    expect(signIn).toHaveBeenCalledWith('google', { callbackUrl: '/' })
  })
})
