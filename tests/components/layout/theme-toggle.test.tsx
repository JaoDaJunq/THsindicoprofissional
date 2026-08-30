import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeToggle } from '@/components/layout/theme-toggle'

// jsdom in this setup has no localStorage of its own.
const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => store.set(key, value),
})

beforeEach(() => {
  document.documentElement.classList.remove('dark')
  store.clear()
})

describe('ThemeToggle', () => {
  it('turns the dark mode on', async () => {
    render(<ThemeToggle />)

    await userEvent.click(screen.getByRole('button', { name: 'Usar o modo escuro' }))

    expect(document.documentElement).toHaveClass('dark')
  })

  it('turns the dark mode off again', async () => {
    render(<ThemeToggle />)

    await userEvent.click(screen.getByRole('button', { name: 'Usar o modo escuro' }))
    await userEvent.click(screen.getByRole('button', { name: 'Usar o modo claro' }))

    expect(document.documentElement).not.toHaveClass('dark')
  })

  it('remembers the choice for the next visit', async () => {
    render(<ThemeToggle />)

    await userEvent.click(screen.getByRole('button', { name: 'Usar o modo escuro' }))

    expect(localStorage.getItem('theme')).toBe('dark')
  })

  it('starts from the mode the page already has', () => {
    document.documentElement.classList.add('dark')

    render(<ThemeToggle />)

    expect(screen.getByRole('button', { name: 'Usar o modo claro' })).toBeInTheDocument()
  })
})
