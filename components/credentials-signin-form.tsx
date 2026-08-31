'use client'

import { Button, Input, Label, TextField } from '@heroui/react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { useState } from 'react'
import type { FormEvent, ReactElement } from 'react'
import { textField } from '@/shared/form'

export function CredentialsSignInForm(): ReactElement {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const form = new FormData(event.currentTarget)

    setIsSubmitting(true)
    setError(null)

    const result = await signIn('credentials', {
      username: textField(form, 'username'),
      password: textField(form, 'password'),
      redirect: false,
    })

    setIsSubmitting(false)

    if (result?.error) {
      setError('Usuário ou senha incorretos.')
      return
    }

    // The home page decides where to go: it may be the forced password change.
    router.replace('/')
    router.refresh()
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-3">
      <TextField variant="secondary" name="username" isRequired autoComplete="username">
        <Label>Usuário</Label>
        <Input placeholder="admin" />
      </TextField>

      <TextField
        variant="secondary"
        name="password"
        type="password"
        isRequired
        autoComplete="current-password"
      >
        <Label>Senha</Label>
        <Input />
      </TextField>

      {error && (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      )}

      <Button type="submit" variant="primary" isPending={isSubmitting} className="w-full">
        Entrar
      </Button>
    </form>
  )
}
