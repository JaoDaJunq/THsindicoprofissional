import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ResidentHomePage from '@/app/(app)/portal/page'
import { buildUser } from '@/tests/support/build-user'
import type { Membership } from '@/shared/types'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

const useAccount = vi.fn()
vi.mock('@/hooks/use-account', () => ({ useAccount: (...a: unknown[]) => useAccount(...a) }))

const useMemberships = vi.fn()
vi.mock('@/hooks/use-memberships', () => ({
  useMemberships: (...a: unknown[]) => useMemberships(...a),
}))

const morador = buildUser({ role: 'RESIDENT' })

const vinculo: Membership = {
  id: 'm1',
  role: 'RESIDENT',
  user: { id: morador.id, name: morador.name, email: morador.email },
  condominium: { id: 'c1', name: 'Residencial Aurora' },
}

beforeEach(() => {
  push.mockReset()
  useAccount.mockReset()
  useMemberships.mockReset()
  useAccount.mockReturnValue({ account: morador, isLoading: false, isGone: false })
  useMemberships.mockReturnValue({ memberships: [vinculo], isLoading: false, error: null })
})

describe('ResidentHomePage', () => {
  it('cumprimenta a pessoa pelo nome', () => {
    render(<ResidentHomePage />)

    expect(screen.getByRole('heading', { name: /Ana Souza/ })).toBeInTheDocument()
  })

  it('mostra os dados da pessoa antes dos condomínios', () => {
    render(<ResidentHomePage />)

    const dados = screen.getByRole('heading', { name: 'Meus dados' })
    const condominios = screen.getByRole('heading', { name: 'Meus condomínios' })

    expect(dados.compareDocumentPosition(condominios)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  })

  it('mostra o e-mail da pessoa', () => {
    render(<ResidentHomePage />)

    expect(screen.getByText(morador.email)).toBeInTheDocument()
  })

  it('leva para a edição dos próprios dados', async () => {
    render(<ResidentHomePage />)

    await userEvent.click(screen.getByRole('button', { name: 'Editar meus dados' }))

    expect(push).toHaveBeenCalledWith('/portal/dados')
  })

  it('lista o condomínio com o papel de quem entrou', () => {
    render(<ResidentHomePage />)

    expect(screen.getByText('Residencial Aurora')).toBeInTheDocument()
    expect(screen.getByText('Morador')).toBeInTheDocument()
  })

  it('diz quando a pessoa não está em condomínio nenhum', () => {
    useMemberships.mockReturnValue({ memberships: [], isLoading: false, error: null })

    render(<ResidentHomePage />)

    expect(screen.getByText(/ainda não está vinculado/i)).toBeInTheDocument()
  })

  it('pede os vínculos da própria pessoa', () => {
    render(<ResidentHomePage />)

    expect(useMemberships).toHaveBeenCalledWith({ userId: morador.id })
  })

  it('espera a conta carregar antes de desenhar', () => {
    useAccount.mockReturnValue({ account: null, isLoading: true, isGone: false })

    render(<ResidentHomePage />)

    expect(screen.getByText('Carregando…')).toBeInTheDocument()
  })
  it('cumprimenta pelo e-mail quem ainda não tem nome', () => {
    useAccount.mockReturnValue({
      account: buildUser({ role: 'RESIDENT', name: null }),
      isLoading: false,
      isGone: false,
    })

    render(<ResidentHomePage />)

    expect(screen.getByRole('heading', { name: /ana@example.com/ })).toBeInTheDocument()
  })

  it('mostra um travessão no lugar do nome que não existe', () => {
    useAccount.mockReturnValue({
      account: buildUser({ role: 'RESIDENT', name: null }),
      isLoading: false,
      isGone: false,
    })

    render(<ResidentHomePage />)

    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('conta quando os vínculos não carregaram', () => {
    useMemberships.mockReturnValue({
      memberships: [],
      isLoading: false,
      error: 'Não foi possível carregar os vínculos.',
    })

    render(<ResidentHomePage />)

    expect(screen.getByRole('alert')).toHaveTextContent(/não foi possível/i)
  })
})
