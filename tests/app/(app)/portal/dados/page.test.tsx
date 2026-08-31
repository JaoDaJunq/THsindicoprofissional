import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ResidentProfilePage from '@/app/(app)/portal/dados/page'
import { buildUser } from '@/tests/support/build-user'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

const useAccount = vi.fn()
vi.mock('@/hooks/use-account', () => ({ useAccount: (...a: unknown[]) => useAccount(...a) }))

const morador = buildUser({ role: 'RESIDENT' })

beforeEach(() => {
  push.mockReset()
  useAccount.mockReset()
  useAccount.mockReturnValue({ account: morador, isLoading: false, isGone: false })
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => morador }))
})

async function salvar(): Promise<void> {
  await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
}

describe('ResidentProfilePage', () => {
  it('começa com o que a pessoa já tem cadastrado', () => {
    render(<ResidentProfilePage />)

    expect(screen.getByLabelText('Nome')).toHaveValue('Ana Souza')
    expect(screen.getByLabelText('E-mail')).toHaveValue(morador.email)
  })

  it('salva na API da própria pessoa', async () => {
    render(<ResidentProfilePage />)

    await userEvent.clear(screen.getByLabelText('Nome'))
    await userEvent.type(screen.getByLabelText('Nome'), 'Ana Paula')
    await salvar()

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        `/api/users/${morador.id}`,
        expect.objectContaining({ method: 'PATCH' }),
      ),
    )
  })

  it('nunca manda papel junto, nem por engano', async () => {
    render(<ResidentProfilePage />)

    await salvar()

    await waitFor(() => {
      const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body))
      expect(body).toEqual({ name: 'Ana Souza', email: morador.email })
    })
  })

  it('volta para o início depois de salvar', async () => {
    render(<ResidentProfilePage />)

    await salvar()

    await waitFor(() => expect(push).toHaveBeenCalledWith('/portal'))
  })

  it('recusa salvar sem nome', async () => {
    render(<ResidentProfilePage />)

    await userEvent.clear(screen.getByLabelText('Nome'))
    await salvar()

    expect(fetch).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(/nome/i)
  })

  it('conta o que o servidor recusou', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'invalid-email' }) }),
    )
    render(<ResidentProfilePage />)

    await salvar()

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/e-mail/i))
  })

  it('volta sem salvar quando a pessoa desiste', async () => {
    render(<ResidentProfilePage />)

    await userEvent.click(screen.getByRole('button', { name: 'Voltar' }))

    expect(fetch).not.toHaveBeenCalled()
    expect(push).toHaveBeenCalledWith('/portal')
  })
  it('espera a conta carregar antes de desenhar o formulário', () => {
    useAccount.mockReturnValue({ account: null, isLoading: true, isGone: false })

    render(<ResidentProfilePage />)

    expect(screen.getByText('Carregando…')).toBeInTheDocument()
  })

  it('começa vazio o nome de quem ainda não tem um', () => {
    useAccount.mockReturnValue({
      account: buildUser({ role: 'RESIDENT', name: null }),
      isLoading: false,
      isGone: false,
    })

    render(<ResidentProfilePage />)

    expect(screen.getByLabelText('Nome')).toHaveValue('')
  })

  it('avisa quando a rede cai no meio do salvamento', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    render(<ResidentProfilePage />)

    await salvar()

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/não foi possível/i))
  })

  it('mostra a mensagem genérica quando o servidor não explica o erro', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }))
    render(<ResidentProfilePage />)

    await salvar()

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/não foi possível/i))
  })
})
