'use client'

import { Button, Card, CardContent, Input, Label, TextField } from '@heroui/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { FormEvent, ReactElement } from 'react'
import { textField } from '@/shared/form'

const MESSAGES: Record<string, string> = {
  'invalid-credentials': 'A senha atual está incorreta.',
  'password-too-short': 'A nova senha precisa de pelo menos 8 caracteres.',
  'password-unchanged': 'A nova senha precisa ser diferente da atual.',
}

export default function ChangePasswordPage(): ReactElement {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const form = new FormData(event.currentTarget)

    setIsSubmitting(true)
    setError(null)

    const response = await fetch('/api/account/password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        currentPassword: textField(form, 'currentPassword'),
        newPassword: textField(form, 'newPassword'),
      }),
    })

    setIsSubmitting(false)

    if (response.ok) {
      router.replace('/users')
      return
    }

    const body = (await response.json()) as { error?: string }
    setError(MESSAGES[body.error ?? ''] ?? 'Não foi possível trocar a senha.')
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardContent className="gap-4 p-6">
          <h1 className="text-xl font-semibold">Trocar a senha</h1>
          <p className="text-default-500 text-sm">
            Este é o seu primeiro acesso. Defina uma senha só sua antes de continuar.
          </p>

          <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-3">
            <TextField name="currentPassword" type="password" isRequired>
              <Label>Senha atual</Label>
              <Input />
            </TextField>

            <TextField name="newPassword" type="password" isRequired>
              <Label>Nova senha</Label>
              <Input />
            </TextField>

            {error && (
              <p role="alert" className="text-danger text-sm">
                {error}
              </p>
            )}

            <Button type="submit" variant="primary" isPending={isSubmitting} className="w-full">
              Trocar a senha
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
