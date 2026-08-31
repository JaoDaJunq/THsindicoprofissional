import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ImpersonationBanner } from '@/components/layout/impersonation-banner'
import { buildUser } from '@/tests/support/build-user'

const update = vi.fn()
const useSession = vi.fn()
vi.mock('next-auth/react', () => ({ useSession: () => useSession() }))

const refresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))

const pessoa = buildUser({ name: 'Ana Souza', role: 'RESIDENT' })

beforeEach(() => {
  update.mockReset()
  refresh.mockReset()
  useSession.mockReturnValue({
    data: { user: { id: pessoa.id, isImpersonated: true } },
    update,
  })
})

describe('ImpersonationBanner', () => {
  it('diz em nome de quem a pessoa está navegando', () => {
    render(<ImpersonationBanner account={pessoa} />)

    expect(screen.getByRole('alert')).toHaveTextContent(/Ana Souza/)
  })

  it('não cerca a tela com moldura nenhuma', () => {
    render(<ImpersonationBanner account={pessoa} />)

    expect(screen.queryByTestId('impersonation-frame')).not.toBeInTheDocument()
  })

  it('fica no fluxo da página, sem cobrir o que está embaixo', () => {
    render(<ImpersonationBanner account={pessoa} />)

    const pilula = screen.getByRole('alert')

    expect(pilula.className).not.toContain('fixed')
    expect(pilula.className).not.toContain('absolute')
  })

  it('não aparece quando ninguém está impersonando', () => {
    useSession.mockReturnValue({ data: { user: { id: pessoa.id, isImpersonated: false } }, update })

    render(<ImpersonationBanner account={pessoa} />)

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('não aparece sem sessão nenhuma', () => {
    useSession.mockReturnValue({ data: null, update })

    render(<ImpersonationBanner account={pessoa} />)

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('devolve a sessão ao administrador', async () => {
    render(<ImpersonationBanner account={pessoa} />)

    await userEvent.click(screen.getByRole('button', { name: 'Voltar a ser eu' }))

    await waitFor(() => expect(update).toHaveBeenCalledWith({ stopImpersonating: true }))
  })

  it('recarrega a tela depois de voltar, para nada ficar da pessoa anterior', async () => {
    render(<ImpersonationBanner account={pessoa} />)

    await userEvent.click(screen.getByRole('button', { name: 'Voltar a ser eu' }))

    await waitFor(() => expect(refresh).toHaveBeenCalled())
  })

  it('chama pelo e-mail quem não tem nome', () => {
    render(<ImpersonationBanner account={buildUser({ name: null })} />)

    expect(screen.getByRole('alert')).toHaveTextContent(/ana@example.com/)
  })
  it('encurta o rótulo do botão no telefone', () => {
    render(<ImpersonationBanner account={pessoa} />)

    const botao = screen.getByRole('button', { name: /Voltar/ })

    expect(botao).toHaveTextContent('Voltar')
    expect(botao.querySelector('[class*="max-sm:hidden"]')).not.toBeNull()
  })

  it('não deixa a pílula passar da largura da tela', () => {
    render(<ImpersonationBanner account={pessoa} />)

    expect(screen.getByRole('alert').className).toContain('max-w-[calc(100vw-1.5rem)]')
  })
  it('usa a cor invertida do tema: preta no claro, branca no escuro', () => {
    render(<ImpersonationBanner account={pessoa} />)

    // foreground/background trocados: o próprio tema vira a cor, sem `dark:`
    expect(screen.getByRole('alert').className).toContain('bg-foreground')
    expect(screen.getByRole('alert').className).toContain('text-background')
  })
  it('é uma pílula: encolhe até o conteúdo, em vez de ocupar a linha toda', () => {
    render(<ImpersonationBanner account={pessoa} />)

    expect(screen.getByRole('alert').className).toContain('sm:w-fit')
  })
  it('dá ao botão um alvo de toque no telefone', () => {
    render(<ImpersonationBanner account={pessoa} />)

    const botao = screen.getByRole('button', { name: 'Voltar a ser eu' })

    // 44px no telefone, e volta ao tamanho normal a partir de sm:
    expect(botao.className).toContain('min-h-11')
    expect(botao.className).toContain('sm:min-h-9')
  })

  it('ocupa a largura no telefone e encolhe no desktop', () => {
    render(<ImpersonationBanner account={pessoa} />)

    const pilula = screen.getByRole('alert')

    expect(pilula.className).toContain('w-full')
    expect(pilula.className).toContain('sm:w-fit')
  })

  it('deixa o nome comprido truncar em vez de espremer o botão', () => {
    render(<ImpersonationBanner account={pessoa} />)

    const texto = screen.getByRole('alert').querySelector('span')

    expect(texto?.className).toContain('truncate')
    expect(texto?.className).toContain('min-w-0')
  })
})
