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
      <head>
        {/* applies the saved mode before the first paint, so the page never flashes */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(localStorage.theme==='dark')document.documentElement.classList.add('dark')}catch{}",
          }}
        />
      </head>
      <body className="bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
