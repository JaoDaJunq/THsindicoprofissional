import { render, screen } from '@testing-library/react'
import { ResponsiveDialog } from '@/components/responsive-dialog'
import { setScreen } from '@/tests/support/match-media'

function renderDialog(kind: 'mobile' | 'desktop'): void {
  setScreen(kind)
  render(
    <ResponsiveDialog isOpen onOpenChange={() => undefined} title="Filtros" footer={<p>rodapé</p>}>
      <p>conteúdo</p>
    </ResponsiveDialog>,
  )
}

describe('ResponsiveDialog', () => {
  it('shows the content on the desktop', () => {
    renderDialog('desktop')

    expect(screen.getByText('conteúdo')).toBeInTheDocument()
  })

  it('renders a centred modal on the desktop', () => {
    renderDialog('desktop')

    expect(screen.getByTestId('filters-modal')).toBeInTheDocument()
  })

  it('renders a bottom drawer on the phone', () => {
    renderDialog('mobile')

    expect(screen.getByTestId('filters-drawer')).toBeInTheDocument()
  })

  it('shows the bar that says where to drag the drawer', () => {
    renderDialog('mobile')

    expect(
      screen.getByTestId('filters-drawer').querySelector('[data-slot="drawer-handle-bar"]'),
    ).not.toBeNull()
  })

  it('shows the title in both shapes', () => {
    renderDialog('mobile')

    expect(screen.getByText('Filtros')).toBeInTheDocument()
  })

  it('shows the footer', () => {
    renderDialog('desktop')

    expect(screen.getByText('rodapé')).toBeInTheDocument()
  })
})
