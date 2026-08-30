import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ChangePasswordPage from '@/app/change-password/page'

const replace = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }))

beforeEach(() => {
  replace.mockReset()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
})

async function submit(current = 'admin', novo = 'uma-senha-longa'): Promise<void> {
  render(<ChangePasswordPage />)
  await userEvent.type(screen.getByLabelText('Senha atual'), current)
  await userEvent.type(screen.getByLabelText('Nova senha'), novo)
  await userEvent.click(screen.getByRole('button', { name: 'Trocar a senha' }))
}

function failingWith(error: string): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error }) }),
  )
}

describe('ChangePasswordPage', () => {
  it('explains why the person is here', () => {
    render(<ChangePasswordPage />)

    expect(screen.getByText(/primeiro acesso/i)).toBeInTheDocument()
  })

  it('sends both passwords to the API', async () => {
    await submit()

    expect(fetch).toHaveBeenCalledWith('/api/account/password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ currentPassword: 'admin', newPassword: 'uma-senha-longa' }),
    })
  })

  it('moves on to the app once the password changed', async () => {
    await submit()

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/users'))
  })

  it('explains a wrong current password', async () => {
    failingWith('invalid-credentials')

    await submit()

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/senha atual está incorreta/i),
    )
  })

  it('explains a password that is too short', async () => {
    failingWith('password-too-short')

    await submit('admin', 'curta')

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/pelo menos 8 caracteres/i),
    )
  })

  it('explains a password that did not change', async () => {
    failingWith('password-unchanged')

    await submit()

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/diferente da atual/i),
    )
  })

  it('falls back to a generic message for an unknown error', async () => {
    failingWith('weird')

    await submit()

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/não foi possível trocar a senha/i),
    )
  })

  it('falls back to a generic message when the failure has no code', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }))

    await submit()

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/não foi possível trocar a senha/i),
    )
  })
})
