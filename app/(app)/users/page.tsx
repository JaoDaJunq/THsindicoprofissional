'use client'

import { SearchField } from '@heroui/react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useState } from 'react'
import type { ReactElement } from 'react'
import { DeactivateUserDialog } from '@/components/user/deactivate-dialog'
import { UserFiltersDialog } from '@/components/user/filters-dialog'
import { FilterButton } from '@/components/list/filter-button'
import { ListPagination } from '@/components/list/pagination'
import { UserList } from '@/components/user/list'
import { impersonates } from '@/domain/authorization'
import { useAccount } from '@/hooks/use-account'
import { useUsers } from '@/hooks/use-users'
import type { User, UserFilters } from '@/shared/types'

export default function UsersPage(): ReactElement {
  const router = useRouter()
  const [filters, setFilters] = useState<UserFilters>({})
  const [page, setPage] = useState(1)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [userToDeactivate, setUserToDeactivate] = useState<User | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const { page: result, isLoading, error } = useUsers(filters, page, reloadToken)
  const { account } = useAccount(true)
  const { update } = useSession()

  /** Seeing the system as someone else rewrites the session, then goes home. */
  async function impersonate(user: User): Promise<void> {
    await update({ impersonate: user.id })
    router.push('/portal')
  }

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
            onImpersonate={account ? (user: User): void => void impersonate(user) : undefined}
            canImpersonate={(user: User): boolean =>
              account !== null && impersonates(account, user)
            }
          />
        )
      )}

      {result && result.pageCount > 1 && (
        <ListPagination
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
