'use client'

import { Button, SearchField, Tooltip } from '@heroui/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { ReactElement } from 'react'
import { DeactivateUserDialog } from '@/components/user/deactivate-dialog'
import { UserFiltersDialog } from '@/components/user/filters-dialog'
import { UsersPagination } from '@/components/user/list/pagination'
import { UserList } from '@/components/user/list'
import { useUsers } from '@/hooks/use-users'
import type { User, UserFilters } from '@/shared/types'

function FilterIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-4">
      <path
        d="M3 5h18M6 12h12M10 19h4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function FilterButton({ onPress }: { onPress: () => void }): ReactElement {
  return (
    <Tooltip>
      <Tooltip.Trigger>
        <Button aria-label="Filtros" isIconOnly variant="primary" onPress={onPress}>
          <FilterIcon />
        </Button>
      </Tooltip.Trigger>
      <Tooltip.Content>Filtros</Tooltip.Content>
    </Tooltip>
  )
}

export default function UsersPage(): ReactElement {
  const router = useRouter()
  const [filters, setFilters] = useState<UserFilters>({})
  const [page, setPage] = useState(1)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [userToDeactivate, setUserToDeactivate] = useState<User | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const { page: result, isLoading, error } = useUsers(filters, page, reloadToken)

  function search(term: string): void {
    setPage(1)
    setFilters((current) => ({ ...current, search: term || undefined }))
  }

  function applyFilters(next: UserFilters): void {
    setPage(1)
    setFilters(next)
  }

  async function activate(user: User): Promise<void> {
    await fetch(`/api/users/${user.id}/restore`, { method: 'POST' })
    setReloadToken((token) => token + 1)
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">Usuários</h1>

      <div className="flex items-center gap-2">
        <SearchField aria-label="Buscar usuários" className="flex-1" onChange={search}>
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="escreva para busca..." />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
        <FilterButton onPress={() => setIsFilterOpen(true)} />
      </div>

      {error && (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      )}

      {isLoading && !result ? (
        <p className="text-default-500 text-sm">Carregando…</p>
      ) : result && result.items.length === 0 ? (
        <p className="text-default-500 text-sm">Nenhum usuário encontrado.</p>
      ) : (
        result && (
          <UserList
            users={result.items}
            firstIndex={(result.page - 1) * result.pageSize}
            onEdit={(user) => router.push(`/users/${user.id}`)}
            onDeactivate={setUserToDeactivate}
            onActivate={(user) => void activate(user)}
          />
        )
      )}

      {result && result.pageCount > 1 && (
        <UsersPagination
          page={result.page}
          pageCount={result.pageCount}
          onPageChange={setPage}
        />
      )}

      <DeactivateUserDialog
        user={userToDeactivate}
        onOpenChange={(isOpen) => !isOpen && setUserToDeactivate(null)}
        onDeleted={() => setReloadToken((token) => token + 1)}
      />

      <UserFiltersDialog
        isOpen={isFilterOpen}
        onOpenChange={setIsFilterOpen}
        filters={filters}
        onApply={applyFilters}
      />
    </main>
  )
}
