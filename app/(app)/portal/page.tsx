'use client'

import { Button, Chip } from '@heroui/react'
import { useRouter } from 'next/navigation'
import type { ReactElement } from 'react'
import { Section } from '@/components/form/section'
import { MEMBERSHIP_ROLE_LABEL } from '@/components/membership-editor'
import { useAccount } from '@/hooks/use-account'
import { useMemberships } from '@/hooks/use-memberships'

/**
 * Where a resident lands. It shows only what the system actually knows today:
 * who the person is, and which condominiums they belong to.
 */
export default function ResidentHomePage(): ReactElement {
  const router = useRouter()
  const { account, isLoading } = useAccount(true)

  if (isLoading || !account) {
    return <p className="text-default-500 p-6 text-sm">Carregando…</p>
  }

  return <Portal account={account} onEdit={() => router.push('/portal/dados')} />
}

function Portal({
  account,
  onEdit,
}: {
  account: NonNullable<ReturnType<typeof useAccount>['account']>
  onEdit: () => void
}): ReactElement {
  const { memberships, error } = useMemberships({ userId: account.id })

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">Olá, {account.name ?? account.email}</h1>

      <Section title="Meus dados">
        <dl className="flex flex-col gap-3 text-sm">
          <div className="flex flex-col gap-1">
            <dt className="text-default-500 text-xs">Nome</dt>
            <dd>{account.name ?? '—'}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-default-500 text-xs">E-mail</dt>
            <dd>{account.email}</dd>
          </div>
        </dl>
        <Button variant="outline" className="w-full sm:w-auto sm:self-start" onPress={onEdit}>
          Editar meus dados
        </Button>
      </Section>

      <Section title="Meus condomínios">
        {error && (
          <p role="alert" className="text-danger text-sm">
            {error}
          </p>
        )}

        {memberships.length === 0 ? (
          <p className="text-default-500 text-sm">
            Você ainda não está vinculado a nenhum condomínio. Quem cuida do seu prédio
            pode fazer isso.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {memberships.map((membership) => (
              <li key={membership.id} className="flex items-center gap-3">
                <span className="flex-1 truncate text-sm">{membership.condominium.name}</span>
                <Chip variant="soft">{MEMBERSHIP_ROLE_LABEL[membership.role]}</Chip>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </main>
  )
}
