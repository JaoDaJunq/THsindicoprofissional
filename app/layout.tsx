import './globals.css'
import type { ReactElement, ReactNode } from 'react'
import type { Metadata } from 'next'
import { Providers } from '@/components/providers'

export const metadata: Metadata = {
  title: 'Gestão Condominial',
  description: 'Portal do síndico, do morador e do administrador',
}

export default function RootLayout({ children }: { children: ReactNode }): ReactElement {
  return (
    <html lang="pt-BR">
      <body className="bg-default-50 text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
