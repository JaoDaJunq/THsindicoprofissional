'use client'

import { Button, Chip, ComboBox, Input, Label, ListBox } from '@heroui/react'
import { useState } from 'react'
import type { Key } from 'react-aria-components'
import type { ReactElement } from 'react'
import { useMemberships } from '@/hooks/use-memberships'
import { useSearch } from '@/hooks/use-search'
import type { SearchResource } from '@/hooks/use-search'
import type { CondominiumRole, Membership, MembershipFilters } from '@/shared/types'

export interface MembershipOption {
  id: string
  label: string
}

export interface MembershipEditorProps {
  /** The side that does not change: a condominium's people, or a person's condominiums. */
  side: MembershipFilters
  /** Where the other side is searched: hundreds of rows never come down at once. */
  resource: SearchResource
  searchLabel: string
}

const ROLE_LABEL = { RESIDENT: 'Morador', MANAGER: 'Síndico' } as const

/** The field says what it searches: the same box serves both sides. */
const PLACEHOLDER = {
  users: 'escreva o nome da pessoa...',
  condominiums: 'escreva o nome do condomínio...',
} as const

/** The end of the link that varies: the person, or the condominium. */
function other(membership: Membership, side: MembershipFilters): MembershipOption {
  return 'condominiumId' in side
    ? { id: membership.user.id, label: membership.user.name ?? membership.user.email }
    : { id: membership.condominium.id, label: membership.condominium.name }
}

function pairOf(side: MembershipFilters, otherId: string): Record<string, string> {
  return 'condominiumId' in side
    ? { condominiumId: side.condominiumId, userId: otherId }
    : { userId: side.userId, condominiumId: otherId }
}

/**
 * Both screens edit the same n↔n link, so both use this: one side is fixed by
 * whoever is on screen, the other is chosen here.
 */
export function MembershipEditor({
  side,
  resource,
  searchLabel,
}: MembershipEditorProps): ReactElement {
  const [reloadToken, setReloadToken] = useState(0)
  const [failure, setFailure] = useState<string | null>(null)
  const [term, setTerm] = useState('')
  /** Whose removal is waiting for a second click. One at a time. */
  const [confirming, setConfirming] = useState<string | null>(null)
  const { memberships, error } = useMemberships(side, reloadToken)
  const { results } = useSearch(resource, term)

  const linked = new Set(memberships.map((membership) => other(membership, side).id))
  const available = results.filter((result) => !linked.has(result.id))

  async function call(request: Promise<Response>): Promise<void> {
    setFailure(null)
    try {
      const response = await request
      if (!response.ok) throw new Error('request-failed')
      setReloadToken((token) => token + 1)
    } catch {
      setFailure('Não foi possível salvar o vínculo. Tente de novo.')
    }
  }

  function add(key: Key | null): void {
    if (key === null) return

    setTerm('')
    void call(
      fetch('/api/memberships', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...pairOf(side, String(key)), role: 'RESIDENT' }),
      }),
    )
  }

  function changeRole(otherId: string, role: CondominiumRole): void {
    void call(
      fetch('/api/memberships', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...pairOf(side, otherId), role }),
      }),
    )
  }

  /** First click asks, second one removes: no dialog for a link that is cheap to redo. */
  function remove(otherId: string): void {
    if (confirming !== otherId) {
      setConfirming(otherId)
      return
    }

    setConfirming(null)
    const { userId, condominiumId } = pairOf(side, otherId)
    void call(
      fetch(`/api/memberships?userId=${userId}&condominiumId=${condominiumId}`, {
        method: 'DELETE',
      }),
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {(error ?? failure) && (
        <p role="alert" className="text-danger text-sm">
          {error ?? failure}
        </p>
      )}

      {/* the list is the search result, never the whole table */}
      <ComboBox
        variant="secondary"
        items={available}
        inputValue={term}
        onInputChange={setTerm}
        onSelectionChange={add}
        allowsEmptyCollection
      >
        <Label>{searchLabel}</Label>
        <ComboBox.InputGroup>
          <Input placeholder={PLACEHOLDER[resource]} />
        </ComboBox.InputGroup>
        <ComboBox.Popover>
          <ListBox
            renderEmptyState={() => (
              <p className="text-default-500 p-3 text-sm">Ninguém encontrado.</p>
            )}
          >
            {(option: MembershipOption) => (
              <ListBox.Item id={option.id} textValue={option.label}>
                {option.label}
              </ListBox.Item>
            )}
          </ListBox>
        </ComboBox.Popover>
      </ComboBox>
      {memberships.length === 0 ? (
        <p className="text-default-500 text-sm">Ninguém vinculado ainda.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {memberships.map((membership) => {
            const end = other(membership, side)
            const next: CondominiumRole =
              membership.role === 'MANAGER' ? 'RESIDENT' : 'MANAGER'

            return (
              <li key={membership.id} className="flex items-center gap-2">
                <span className="flex-1 truncate text-sm">{end.label}</span>
                <Chip variant="soft">{ROLE_LABEL[membership.role]}</Chip>
                <Button
                  aria-label={`Tornar ${end.label} ${ROLE_LABEL[next].toLowerCase()}`}
                  variant="ghost"
                  onPress={() => changeRole(end.id, next)}
                >
                  {ROLE_LABEL[next]}
                </Button>
                <Button
                  aria-label={
                    confirming === end.id
                      ? `Confirmar desvincular ${end.label}`
                      : `Desvincular ${end.label}`
                  }
                  variant={confirming === end.id ? 'danger' : 'ghost'}
                  onPress={() => remove(end.id)}
                >
                  {confirming === end.id ? 'Confirmar' : 'Remover'}
                </Button>
              </li>
            )
          })}
        </ul>
      )}

    </div>
  )
}
