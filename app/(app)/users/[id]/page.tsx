'use client'

import { Button, Input, Label, Radio, RadioGroup, Surface, TextField } from '@heroui/react'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { MembershipEditor } from '@/components/membership-editor'
import { ROLE_LABEL } from '@/components/user/role-chip'
import { isAdmin } from '@/domain/authorization'
import { useAccount } from '@/hooks/use-account'
import { useUser } from '@/hooks/use-user'
import type { User, UserRole } from '@/shared/types'

const MESSAGES: Record<string, string> = {
  'invalid-name': 'O nome não pode ficar vazio.',
  'invalid-email': 'Esse e-mail não parece válido.',
  'email-already-registered': 'Esse e-mail já está em uso por outra pessoa.',
  'invalid-username': 'O usuário não pode ficar vazio.',
  'username-taken': 'Esse usuário já pertence a outra pessoa.',
  'password-too-short': 'A senha precisa de pelo menos 8 caracteres.',
  forbidden: 'Só um síndico pode editar outra pessoa.',
}

const GENERIC = 'Não foi possível salvar. Tente de novo.'

interface Draft {
  name: string
  email: string
  role: UserRole
  username: string
  password: string
}

function draftOf(user: User): Draft {
  return {
    name: user.name ?? '',
    email: user.email,
    role: user.role,
    username: user.username ?? '',
    password: '',
  }
}

function Section({ title, children }: { title: string; children: ReactNode }): ReactElement {
  return (
    <Surface className="border-default-200 flex flex-col gap-4 rounded-2xl border p-5">
      <h2 className="text-sm font-semibold">{title}</h2>
      {children}
    </Surface>
  )
}

function Field({
  label,
  value,
  onChange,
  type,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: 'password'
}): ReactElement {
  return (
    <TextField variant="secondary" value={value} onChange={onChange} type={type}>
      <Label>{label}</Label>
      <Input />
    </TextField>
  )
}

export default function UserDetailPage(): ReactElement {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user, isLoading, error } = useUser(id)
  const { account } = useAccount(true)
  const canEditRole = account !== null && isAdmin(account)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  if (isLoading) return <p className="text-default-500 p-6 text-sm">Carregando…</p>

  if (!user) {
    return (
      <p role="alert" className="text-danger p-6 text-sm">
        {error ?? 'Não foi possível carregar essa pessoa.'}
      </p>
    )
  }

  const form = draft ?? draftOf(user)

  function set(change: Partial<Draft>): void {
    setDraft({ ...form, ...change })
  }

  async function send(url: string, method: string, body: unknown): Promise<boolean> {
    const response = await fetch(url, {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (response.ok) return true

    const answer = (await response.json().catch(() => ({}))) as { error?: string }
    setFailure(MESSAGES[answer.error ?? ''] ?? GENERIC)
    return false
  }

  async function save(): Promise<void> {
    setIsSaving(true)
    setFailure(null)

    const saved = await send(`/api/users/${id}`, 'PATCH', {
      name: form.name,
      email: form.email,
      role: form.role,
    })

    const withAccess =
      saved && form.password
        ? await send(`/api/users/${id}/credentials`, 'PUT', {
            username: form.username,
            password: form.password,
          })
        : saved

    setIsSaving(false)
    if (withAccess) router.push('/users')
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">{user.name ?? user.email}</h1>

      <Section title="Contato">
        <Field label="Nome" value={form.name} onChange={(name) => set({ name })} />
        <Field label="E-mail" value={form.email} onChange={(email) => set({ email })} />
      </Section>

      <Section title="Permissões">
        {/* only an administrator hands out power — a manager cannot promote anyone */}
        <RadioGroup
          variant="secondary"
          value={form.role}
          isDisabled={!canEditRole}
          onChange={(role: string) => set({ role: role as UserRole })}
        >
          <Label>Papel</Label>
          <div className="flex flex-wrap gap-4">
            {(['ADMIN', 'MANAGER', 'RESIDENT'] as const).map((role) => (
              <Radio key={role} value={role}>
                <Radio.Control>
                  <Radio.Indicator />
                </Radio.Control>
                <Radio.Content>{ROLE_LABEL[role]}</Radio.Content>
              </Radio>
            ))}
          </div>
        </RadioGroup>
        {!canEditRole && (
          <p className="text-default-500 text-sm">
            Só um administrador do sistema muda o papel de uma pessoa.
          </p>
        )}
      </Section>

      <Section title="Acesso">
        <p className="text-default-500 text-sm">
          Deixe a senha em branco para não mexer no acesso. Ao definir uma, a pessoa
          terá de trocá-la no primeiro acesso.
        </p>
        <Field
          label="Usuário"
          value={form.username}
          onChange={(username) => set({ username })}
        />
        <Field
          label="Nova senha"
          type="password"
          value={form.password}
          onChange={(password) => set({ password })}
        />
      </Section>

      <Section title="Condomínios">
        <MembershipEditor
          side={{ userId: id }}
          resource="condominiums"
          searchLabel="Buscar condomínio"
        />
      </Section>

      {failure && (
        <p role="alert" className="text-danger text-sm">
          {failure}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" className="w-full sm:w-auto" onPress={() => router.push('/users')}>
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
