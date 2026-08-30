import { render, screen } from '@testing-library/react'
import { Providers } from '@/components/providers'

vi.mock('next-auth/react', () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

describe('Providers', () => {
  it('renders what it wraps', () => {
    render(
      <Providers>
        <p>aplicação</p>
      </Providers>,
    )

    expect(screen.getByText('aplicação')).toBeInTheDocument()
  })
})
