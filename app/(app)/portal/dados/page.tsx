'use client'

import { Button } from '@heroui/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { ReactElement } from 'react'
import { Field } from '@/components/form/field'
import { Section } from '@/components/form/section'
import { useAccount } from '@/hooks/use-account'

const MESSAGES: Record<string, string> = {
  'invalid-name': 'O nome não pode ficar vazio.',
  'invalid-email': 'Esse e-mail não parece válido.',
  'email-already-registered': 'Esse e-mail já está em uso por outra pessoa.',
  forbidden: 'Você só pode editar o seu próprio cadastro.',
}

const GENERIC = 'Não foi possível salvar. Tente de novo.'

/** The resident fixing their own contact details. Never their role. */
export default function ResidentProfilePage(): ReactElement {
  const router = useRouter()
  const { account, isLoading } = useAccount(true)

  if (isLoading || !account) {
    return <p className="text-default-500 p-6 text-sm">Carregando…</p>
  }

  return <ProfileForm account={account} onDone={() => router.push('/portal')} />
}

function ProfileForm({
  account,
  onDone,
}: {
  account: NonNullable<ReturnType<typeof useAccount>['account']>
  onDone: () => void
}): ReactElement {
  const [name, setName] = useState(account.name ?? '')
  const [email, setEmail] = useState(account.email)
  const [isSaving, setIsSaving] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)

  async function save(): Promise<void> {
    if (name.trim() === '') return setFailure('O nome não pode ficar vazio.')

    setIsSaving(true)
    setFailure(null)

    try {
      // Only the two fields the person owns: role never rides along.
      const response = await fetch(`/api/users/${account.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, email }),
      })

      if (response.ok) return onDone()

      const answer = (await response.json().catch(() => ({}))) as { error?: string }
      setFailure(MESSAGES[answer.error ?? ''] ?? GENERIC)
    } catch {
      setFailure(GENERIC)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">Meus dados</h1>

      <Section title="Contato">
        <Field label="Nome" value={name} onChange={setName} />
        <Field label="E-mail" value={email} onChange={setEmail} />
      </Section>

      {failure && (
        <p role="alert" className="text-danger text-sm">
          {failure}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" className="w-full sm:w-auto" onPress={onDone}>
          Voltar
        </Button>
        <Button
          variant="primary"
          className="w-full sm:w-auto"
          isPending={isSaving}
          onPress={() => void save()}
        >
          Salvar
        </Button>
      </div>
    </main>
  )
}
