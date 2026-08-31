import type { ReactElement } from 'react'
import RootLayout from '@/app/layout'

vi.mock('@/app/globals.css', () => ({}))

describe('RootLayout', () => {
  it('declares the page as Brazilian Portuguese', () => {
    const html = RootLayout({ children: 'content' }) as ReactElement<{ lang: string }>

    expect(html.props.lang).toBe('pt-BR')
  })
})
