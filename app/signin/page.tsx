'use client'

import { Card, CardContent } from '@heroui/react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import type { ReactElement } from 'react'
import { CredentialsSignInForm } from '@/components/credentials-signin-form'
import { GoogleSignInButton } from '@/components/google-signin-button'

// Keys are the error codes Auth.js appends to the sign-in URL.
const WARNINGS: Record<string, string> = {
  OAuthAccountNotLinked: 'Esse e-mail já está vinculado a outra forma de entrada.',
  AccessDenied: 'Acesso negado. Você precisa autorizar o acesso à sua conta Google.',
  Configuration: 'A entrada com Google não está configurada. Avise o administrador.',
}

const GENERIC_WARNING = 'Não foi possível entrar. Tente de novo.'

const WARNINGS_WITH_CREDENTIALS: Record<string, string> = {
  ...WARNINGS,
  CredentialsSignin: 'Usuário ou senha incorretos.',
}

function SignInCard(): ReactElement {
  const error = useSearchParams().get('error')
  const warning = error
    ? (WARNINGS_WITH_CREDENTIALS[error] ?? GENERIC_WARNING)
    : undefined

  return (
    <Card className="w-full max-w-sm">
      <CardContent className="gap-4 p-6">
        <h1 className="text-xl font-semibold">Gestão Condominial</h1>
        <p className="text-default-500 text-sm">
          Use a conta Google do seu condomínio para entrar.
        </p>
        {warning && (
          <p role="alert" className="text-danger text-sm">
            {warning}
          </p>
        )}
        <CredentialsSignInForm />

        <div className="flex items-center gap-3 py-1">
          <span className="bg-default-200 h-px flex-1" />
          <span className="text-default-500 text-xs">ou</span>
          <span className="bg-default-200 h-px flex-1" />
        </div>

        <GoogleSignInButton />
      </CardContent>
    </Card>
  )
}

export default function SignInPage(): ReactElement {
  return (
    <main className="bg-background flex min-h-screen items-center justify-center p-6">
      <Suspense>
        <SignInCard />
      </Suspense>
    </main>
  )
}
